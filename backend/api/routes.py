import os
import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from models.portfolio_history import PortfolioHistory
from models.trade_tracker_db import TradeTrackerDB
from models.multi_asset_portfolio import MultiAssetPortfolio
from models.enhanced_trade import EnhancedTradeTracker
from models.position_manager import PositionManager
from services.position_service import PositionService

router = APIRouter()
logger = logging.getLogger(__name__)

# 단순 헤더 기반 API 키 보호
def require_api_key(request: Request):
    api_key = os.getenv("ADMIN_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ADMIN_API_KEY 환경변수가 설정되지 않았습니다")
    provided = request.headers.get("X-API-KEY")
    if provided != api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# 글로벌 인스턴스
portfolio_history = PortfolioHistory()
trade_tracker_db = TradeTrackerDB()
enhanced_trade_tracker = EnhancedTradeTracker()
position_manager = PositionManager()
position_service = PositionService(position_manager, enhanced_trade_tracker)
multi_asset_portfolio = MultiAssetPortfolio(
    trade_tracker=enhanced_trade_tracker,
    position_manager=position_manager
)

# Pydantic models for request bodies
class OpenPositionRequest(BaseModel):
    symbol: str
    position_type: Literal['long', 'short']
    entry_price: float
    quantity: float
    dollar_amount: float

class ClosePositionRequest(BaseModel):
    position_id: str
    close_price: Optional[float] = None


def get_trading_client(request: Request):
    trading_client = getattr(request.app.state, "trading_client", None)
    if not trading_client:
        raise HTTPException(status_code=500, detail="Trading client not initialized")
    return trading_client


def get_trading_strategy(request: Request):
    trading_strategy = getattr(request.app.state, "trading_strategy", None)
    if not trading_strategy:
        raise HTTPException(status_code=500, detail="Trading strategy not initialized")
    return trading_strategy


@router.get("/portfolio")
async def get_portfolio(request: Request):
    """포트폴리오 현황 조회 (실제 거래 모드)"""
    trading_client = get_trading_client(request)

    try:
        balance = await trading_client.get_balance()
        current_price = await trading_client.get_current_price()
        
        # API 키가 없는 경우 경고 메시지와 함께 빈 데이터 반환
        if not balance:
            return {
                "balances": {},
                "current_btc_price": current_price,
                "total_value_usd": 0,
                "timestamp": datetime.utcnow().isoformat(),
                "error": "API 키가 설정되지 않았습니다. 실제 잔고를 조회할 수 없습니다.",
                "live_trading": True,
                "authenticated": trading_client.authenticated
            }

        total_usd = 0
        for coin, data in balance.items():
            if coin == "BTC":
                total_usd += data["balance"] * current_price
            elif coin == "USDT":
                total_usd += data["balance"]

        portfolio_data = {
            "balances": balance,
            "current_btc_price": current_price,
            "total_value_usd": total_usd,
            "timestamp": datetime.utcnow().isoformat(),
            "live_trading": True,
            "authenticated": trading_client.authenticated,
            "max_trade_amount": trading_client.max_trade_amount
        }
        
        # 실제 잔고가 있는 경우에만 히스토리에 추가
        if balance:
            portfolio_history.add_snapshot(portfolio_data)
        
        # 수익률 통계 추가 (잔고가 없어도 기본값 반환)
        performance_stats = portfolio_history.get_performance_stats()
        portfolio_data.update(performance_stats)
        
        # BTC 포지션 정보 추가
        btc_pnl = await trade_tracker_db.get_pnl("BTCUSDT", current_price)
        portfolio_data["btc_position"] = btc_pnl
        
        return portfolio_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades")
async def get_trade_history(limit: int = 50):
    """거래 내역 조회 (로컬 DB)"""
    try:
        trades = await trade_tracker_db.recent_trades(limit)
        return {"trades": trades}
    except Exception as e:
        # 거래내역 조회 실패 시 대시보드가 죽지 않도록 빈 목록을 반환
        return {"trades": [], "error": str(e)}


@router.get("/price/{symbol}")
async def get_price(request: Request, symbol: str = "BTCUSDT"):
    """특정 심볼 가격 조회"""
    trading_client = get_trading_client(request)

    try:
        price = await trading_client.get_current_price(symbol)
        return {"symbol": symbol, "price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart/{symbol}")
async def get_chart_data(
    request: Request, symbol: str = "BTCUSDT", interval: str = "1", limit: int = 100
):
    """차트 데이터 조회"""
    trading_client = get_trading_client(request)

    try:
        kline_data = await trading_client.get_kline_data(symbol, interval, limit)

        chart_data = []
        for kline in kline_data:
            chart_data.append(
                {
                    "timestamp": int(kline[0]),
                    "open": float(kline[1]),
                    "high": float(kline[2]),
                    "low": float(kline[3]),
                    "close": float(kline[4]),
                    "volume": float(kline[5]),
                }
            )

        return {"symbol": symbol, "data": chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trading/start")
async def start_trading(request: Request, _auth=Depends(require_api_key)):
    """자동매매 시작"""
    trading_strategy = get_trading_strategy(request)

    if trading_strategy.is_active:
        return {"message": "Trading is already active"}

    asyncio.create_task(trading_strategy.start_trading())
    return {"message": "Auto-trading started"}


@router.post("/trading/stop")
async def stop_trading(request: Request, _auth=Depends(require_api_key)):
    """자동매매 중지"""
    trading_strategy = get_trading_strategy(request)

    trading_strategy.stop_trading()
    return {"message": "Auto-trading stopped"}


@router.get("/trading/status")
async def get_trading_status(request: Request):
    """자동매매 상태 조회"""
    trading_strategy = get_trading_strategy(request)
    return trading_strategy.get_strategy_status()


@router.post("/order")
async def place_manual_order(
    request: Request,
    symbol: str = "BTCUSDT",
    side: str = "Buy",
    qty: str = "0.001",
    _auth=Depends(require_api_key),
):
    """수동 주문"""
    trading_client = get_trading_client(request)

    try:
        result = await trading_client.place_order(symbol, side, "Market", qty)
        if result.get("success"):
            current_price = await trading_client.get_current_price(symbol)
            await trade_tracker_db.add_trade(
                symbol,
                side,
                float(qty),
                current_price,
                signal="manual",
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/history")
async def get_portfolio_history(period: str = "7d"):
    """포트폴리오 히스토리 조회"""
    try:
        history = portfolio_history.get_history(period)
        return {"history": history, "period": period}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/performance")
async def get_portfolio_performance():
    """포트폴리오 수익률 통계"""
    try:
        stats = portfolio_history.get_performance_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions")
async def get_positions():
    """현재 포지션 조회"""
    try:
        positions = await trade_tracker_db.get_current_positions()
        return {"positions": positions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals")
async def get_recent_signals(limit: int = 5):
    """최근 거래 신호 조회 (기본 5개)"""
    try:
        signals = await trade_tracker_db.get_trade_signals(limit)
        return {"signals": signals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pnl/{symbol}")
async def get_pnl(request: Request, symbol: str = "BTCUSDT"):
    """특정 심볼의 손익 조회"""
    trading_client = get_trading_client(request)
    
    try:
        current_price = await trading_client.get_current_price(symbol)
        pnl_data = await trade_tracker_db.get_pnl(symbol, current_price)
        return pnl_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/multi-asset")
async def get_multi_asset_portfolio(request: Request):
    """다중 자산 포트폴리오 현황 조회"""
    trading_client = get_trading_client(request)
    
    try:
        # Get current prices for all supported assets
        current_prices = {}
        for symbol in multi_asset_portfolio.SUPPORTED_ASSETS:
            try:
                price = await trading_client.get_current_price(symbol)
                current_prices[symbol] = price
            except Exception as e:
                logger.warning("가격 조회 실패 (%s): %s", symbol, e)
                current_prices[symbol] = 0.0
        
        # Get comprehensive portfolio data
        portfolio_data = multi_asset_portfolio.get_portfolio_data(current_prices)
        
        # Add portfolio snapshot for history tracking
        if portfolio_data["total_portfolio_value"] > 0:
            multi_asset_portfolio.add_portfolio_snapshot(current_prices)
        
        return portfolio_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/allocation")
async def get_asset_allocation():
    """자산 배분 현황 조회 (파이 차트용)"""
    try:
        allocation = multi_asset_portfolio.get_asset_allocation()
        return {"allocation": allocation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades/markers/{symbol}")
async def get_trade_markers(symbol: str = "BTCUSDT"):
    """특정 심볼의 거래 마커 데이터 조회 (차트용)"""
    try:
        # Get trades from enhanced trade tracker
        symbol_trades = enhanced_trade_tracker.get_trades_by_symbol(symbol)
        
        # Convert trades to chart marker format
        markers = []
        for trade in symbol_trades:
            if trade.status == 'filled':  # Only show filled trades
                markers.append({
                    "id": trade.id,
                    "timestamp": trade.timestamp,
                    "price": trade.price,
                    "type": f"{trade.side}_{trade.position_type}",  # e.g., "buy_long", "sell_short"
                    "side": trade.side,
                    "position_type": trade.position_type,
                    "quantity": trade.quantity,
                    "dollar_amount": trade.dollar_amount,
                    "signal": trade.signal,
                    "fees": trade.fees
                })
        
        # Sort by timestamp
        markers.sort(key=lambda x: x["timestamp"])
        
        return {"symbol": symbol, "markers": markers}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Position Management Endpoints

@router.post("/positions/open")
async def open_position(
    request: Request,
    position_request: OpenPositionRequest,
    _auth=Depends(require_api_key),
):
    """새 포지션 열기"""
    try:
        trading_client = get_trading_client(request)
        
        result = await position_service.open_position(
            symbol=position_request.symbol,
            position_type=position_request.position_type,
            entry_price=position_request.entry_price,
            quantity=position_request.quantity,
            dollar_amount=position_request.dollar_amount,
            trading_client=trading_client
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/positions/close")
async def close_position(
    request: Request,
    close_request: ClosePositionRequest,
    _auth=Depends(require_api_key),
):
    """포지션 닫기"""
    try:
        trading_client = get_trading_client(request)
        
        result = await position_service.close_position(
            position_id=close_request.position_id,
            close_price=close_request.close_price,
            trading_client=trading_client
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/open")
async def get_open_positions(symbol: Optional[str] = None):
    """열린 포지션 조회"""
    try:
        positions = position_service.get_open_positions(symbol)
        return {"positions": positions, "count": len(positions)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/closed")
async def get_closed_positions(symbol: Optional[str] = None, limit: int = 50):
    """닫힌 포지션 조회"""
    try:
        positions = position_service.get_closed_positions(symbol, limit)
        return {"positions": positions, "count": len(positions)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/summary")
async def get_positions_summary(symbol: Optional[str] = None):
    """포지션 요약 및 통계"""
    try:
        summary = position_service.get_position_summary(symbol)
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/{position_id}")
async def get_position_details(position_id: str):
    """특정 포지션 상세 정보"""
    try:
        position = position_service.get_position_by_id(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        return {"position": position}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/positions/update-prices")
async def update_position_prices(request: Request, _auth=Depends(require_api_key)):
    """포지션 가격 업데이트 (실시간 가격 반영)"""
    try:
        trading_client = get_trading_client(request)
        
        # Get current prices for all symbols with open positions
        open_positions = position_service.get_open_positions()
        symbols = list(set([pos["symbol"] for pos in open_positions]))
        
        price_updates = {}
        for symbol in symbols:
            try:
                current_price = await trading_client.get_current_price(symbol)
                price_updates[symbol] = current_price
            except Exception as e:
                logger.warning("Failed to get price for %s: %s", symbol, e)
        
        # Update position prices
        await position_service.update_position_prices(price_updates)
        
        return {
            "success": True,
            "updated_symbols": list(price_updates.keys()),
            "price_updates": price_updates
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/positions/auto-close")
async def auto_close_positions(
    request: Request,
    _auth=Depends(require_api_key),
    symbol: Optional[str] = None,
    max_loss_percent: Optional[float] = None,
    min_profit_percent: Optional[float] = None,
    max_days_open: Optional[int] = None
):
    """조건에 따른 자동 포지션 종료"""
    try:
        trading_client = get_trading_client(request)
        
        # Update prices first
        open_positions = position_service.get_open_positions(symbol)
        symbols = list(set([pos["symbol"] for pos in open_positions]))
        price_updates = {}
        for item_symbol in symbols:
            try:
                current_price = await trading_client.get_current_price(item_symbol)
                price_updates[item_symbol] = current_price
            except Exception as e:
                logger.warning("Failed to get price for %s: %s", item_symbol, e)
        await position_service.update_position_prices(price_updates)
        
        # Auto-close positions based on criteria
        results = await position_service.auto_close_positions_by_criteria(
            symbol=symbol,
            max_loss_percent=max_loss_percent,
            min_profit_percent=min_profit_percent,
            max_days_open=max_days_open
        )
        
        return {
            "success": True,
            "closed_positions": len(results),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
