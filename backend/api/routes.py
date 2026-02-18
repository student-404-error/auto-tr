import os
import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from models.trade_tracker_db import TradeTrackerDB
from services.position_service import PositionService
from trading.strategy_params import RegimeTrendParams

router = APIRouter()
logger = logging.getLogger(__name__)

# 단순 헤더 기반 API 키 보호
def require_api_key(request: Request):
    api_key = os.getenv("ADMIN_KEY") or os.getenv("ADMIN_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ADMIN_KEY or ADMIN_API_KEY is not configured")
    provided = request.headers.get("X-API-KEY")
    if provided != api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# 글로벌 인스턴스
trade_tracker_db = TradeTrackerDB()
position_service = PositionService(trade_tracker_db)
SUPPORTED_ASSETS = ["BTCUSDT", "XRPUSDT", "SOLUSDT"]

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


class ManualOrderRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: Literal["Buy", "Sell"] = "Buy"
    qty: float = 0.001


class StrategyParamsUpdateRequest(BaseModel):
    params: dict


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
            await trade_tracker_db.add_portfolio_snapshot(portfolio_data)
        
        # 수익률 통계 추가 (잔고가 없어도 기본값 반환)
        performance_stats = await trade_tracker_db.get_portfolio_performance()
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
    strategy_task = getattr(request.app.state, "strategy_task", None)

    if trading_strategy.is_active and strategy_task and not strategy_task.done():
        return {"message": "Trading is already active"}

    task = asyncio.create_task(trading_strategy.start_trading())
    request.app.state.strategy_task = task
    return {"message": "Auto-trading started"}


@router.post("/trading/stop")
async def stop_trading(request: Request, _auth=Depends(require_api_key)):
    """자동매매 중지"""
    trading_strategy = get_trading_strategy(request)

    trading_strategy.stop_trading()
    strategy_task = getattr(request.app.state, "strategy_task", None)
    if strategy_task and not strategy_task.done():
        strategy_task.cancel()
    request.app.state.strategy_task = None
    return {"message": "Auto-trading stopped"}


@router.get("/trading/status")
async def get_trading_status(request: Request):
    """자동매매 상태 조회"""
    trading_strategy = get_trading_strategy(request)
    return trading_strategy.get_strategy_status()


@router.post("/trading/params")
async def update_trading_params(
    request: Request,
    payload: StrategyParamsUpdateRequest,
    _auth=Depends(require_api_key),
):
    """전략 파라미터 업데이트"""
    strategy = get_trading_strategy(request)
    updates = payload.params or {}
    if not updates:
        raise HTTPException(status_code=422, detail="params is required")

    status = strategy.get_strategy_status()
    current_params = status.get("parameters", {})
    if not isinstance(current_params, dict):
        raise HTTPException(status_code=400, detail="Current strategy has no editable parameters")

    unknown_keys = [k for k in updates.keys() if k not in current_params]
    if unknown_keys:
        raise HTTPException(status_code=422, detail=f"Unknown params: {', '.join(unknown_keys)}")

    normalized = {}
    for key, value in updates.items():
        current_value = current_params.get(key)
        target_type = type(current_value)
        if target_type is bool:
            normalized[key] = bool(value)
        elif target_type is int:
            normalized[key] = int(value)
        elif target_type is float:
            normalized[key] = float(value)
        else:
            normalized[key] = str(value)

    if hasattr(strategy, "params") and isinstance(getattr(strategy, "params"), RegimeTrendParams):
        params_obj = strategy.params
        for key, value in normalized.items():
            setattr(params_obj, key, value)
        # Keep engine pointing to latest params object.
        if hasattr(strategy, "signal_engine"):
            strategy.signal_engine.params = params_obj
    else:
        for key, value in normalized.items():
            if hasattr(strategy, key):
                setattr(strategy, key, value)

    return {"success": True, "parameters": strategy.get_strategy_status().get("parameters", {})}


@router.post("/order")
async def place_manual_order(
    request: Request,
    order: Optional[ManualOrderRequest] = None,
    symbol: Optional[str] = None,
    side: Optional[str] = None,
    qty: Optional[float] = None,
    _auth=Depends(require_api_key),
):
    """수동 주문"""
    trading_client = get_trading_client(request)

    try:
        payload_symbol = (order.symbol if order else symbol) or "BTCUSDT"
        payload_side = (order.side if order else side) or "Buy"
        payload_qty = float(order.qty if order else (qty if qty is not None else 0.001))

        if payload_side not in ("Buy", "Sell"):
            raise HTTPException(status_code=422, detail="side must be Buy or Sell")
        if payload_qty <= 0:
            raise HTTPException(status_code=422, detail="qty must be > 0")

        result = await trading_client.place_order(
            symbol=payload_symbol,
            side=payload_side,
            order_type="Market",
            qty=f"{payload_qty}",
        )
        if result.get("success"):
            current_price = await trading_client.get_current_price(payload_symbol)
            await trade_tracker_db.add_trade(
                payload_symbol,
                payload_side,
                payload_qty,
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
        history = await trade_tracker_db.get_portfolio_history(period)
        return {"history": history, "period": period}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/performance")
async def get_portfolio_performance():
    """포트폴리오 수익률 통계"""
    try:
        stats = await trade_tracker_db.get_portfolio_performance()
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
async def get_recent_signals(request: Request, limit: int = 5):
    """최근 거래 신호 조회 (기본 5개)"""
    try:
        rows = await trade_tracker_db.get_trade_signals(limit)
        normalized = []
        for row in rows:
            signal = str(row.get("signal") or "").lower()
            side = str(row.get("side") or "").lower()
            symbol = row.get("symbol", "BTCUSDT")
            price = float(row.get("price") or 0.0)

            if "buy" in signal or side == "buy":
                msg = f"BUY signal executed on {symbol} @ {price:.4f}"
                signal_type = "exec"
            elif "sell" in signal or side == "sell":
                msg = f"SELL signal executed on {symbol} @ {price:.4f}"
                signal_type = "exec"
            elif "hold" in signal:
                msg = f"HOLD signal on {symbol}: waiting for confirmation"
                signal_type = "signal"
            else:
                msg = f"Signal update on {symbol}: {row.get('signal', 'n/a')}"
                signal_type = "info"

            normalized.append(
                {
                    "timestamp": row.get("ts"),
                    "type": signal_type,
                    "message": msg,
                    "signal": row.get("signal"),
                    "side": row.get("side"),
                }
            )

        trading_strategy = getattr(request.app.state, "trading_strategy", None)
        if trading_strategy:
            status = trading_strategy.get_strategy_status()
            is_active = status.get("is_active", False)
            last_signal = status.get("last_signal") or "hold"
            last_reason = status.get("last_reason") or ""
            indicators = status.get("indicators") or {}

            # 항상 현재 전략 결정을 맨 위에 삽입
            signal_label = str(last_signal).upper()
            if is_active:
                if signal_label in ("BUY", "SELL"):
                    signal_type = "exec"
                    msg = f"Strategy decision: {signal_label}"
                    if last_reason:
                        msg += f" ({last_reason})"
                else:
                    signal_type = "signal"
                    msg = f"Strategy decision: HOLD"
                    if last_reason:
                        msg += f" — {last_reason}"
            else:
                signal_type = "warn"
                msg = "Strategy is STOPPED"

            normalized.insert(0, {
                "timestamp": datetime.utcnow().isoformat(),
                "type": signal_type,
                "message": msg,
            })

            # 인디케이터 정보 (값이 있을 때만)
            if indicators:
                close_v = float(indicators.get("close") or 0.0)
                ema_fast_v = float(indicators.get("ema_fast") or 0.0)
                ema_slow_v = float(indicators.get("ema_slow") or 0.0)
                gap_v = float(indicators.get("trend_gap_pct") or 0.0)
                atr_v = float(indicators.get("atr") or 0.0)
                normalized.insert(1, {
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "info",
                    "message": (
                        f"close={close_v:.2f}  "
                        f"EMA({ema_fast_v:.2f}/{ema_slow_v:.2f})  "
                        f"gap={gap_v * 100:.3f}%  "
                        f"ATR={atr_v:.2f}"
                    ),
                })
            elif is_active:
                # 전략은 실행 중이지만 아직 첫 루프 미완료
                normalized.insert(1, {
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "info",
                    "message": "Fetching market data... (first cycle in progress)",
                })

        if not normalized:
            normalized = [
                {
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "warn",
                    "message": "No signals yet. Start the strategy to begin.",
                }
            ]
        return {"signals": normalized[:limit]}
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
        current_prices = {}
        for symbol in SUPPORTED_ASSETS:
            try:
                price = await trading_client.get_current_price(symbol)
                current_prices[symbol] = price
            except Exception as e:
                logger.warning("가격 조회 실패 (%s): %s", symbol, e)
                current_prices[symbol] = 0.0

        current_positions = await trade_tracker_db.get_current_positions()
        assets = {}
        total_portfolio_value = 0.0
        total_invested = 0.0
        total_unrealized_pnl = 0.0

        for symbol in SUPPORTED_ASSETS:
            current_price = current_prices.get(symbol, 0.0)
            symbol_positions = current_positions.get(symbol, {})
            spot = symbol_positions.get("spot", {})
            qty = float(spot.get("total_quantity", 0.0))
            invested = float(spot.get("total_invested", 0.0))
            current_value = qty * current_price
            pnl = current_value - invested
            pnl_pct = (pnl / invested * 100) if invested > 0 else 0.0

            total_portfolio_value += current_value
            total_invested += invested
            total_unrealized_pnl += pnl

            assets[symbol] = {
                "symbol": symbol,
                "total_quantity": qty,
                "total_invested": invested,
                "current_value": current_value,
                "average_price": float(spot.get("average_price", 0.0)),
                "current_price": current_price,
                "unrealized_pnl": pnl,
                "unrealized_pnl_percent": pnl_pct,
                "percentage_of_portfolio": 0.0,
            }

        if total_portfolio_value > 0:
            for symbol in assets:
                assets[symbol]["percentage_of_portfolio"] = (
                    assets[symbol]["current_value"] / total_portfolio_value * 100
                )

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "supported_assets": SUPPORTED_ASSETS,
            "assets": assets,
            "total_portfolio_value": total_portfolio_value,
            "total_invested": total_invested,
            "total_unrealized_pnl": total_unrealized_pnl,
            "total_unrealized_pnl_percent": (total_unrealized_pnl / total_invested * 100)
            if total_invested > 0
            else 0.0,
            "asset_count": len([a for a in assets.values() if a["total_quantity"] > 0]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/allocation")
async def get_asset_allocation(request: Request):
    """자산 배분 현황 조회 (파이 차트용)"""
    try:
        portfolio = await get_multi_asset_portfolio(request)
        allocation = {
            symbol: data.get("percentage_of_portfolio", 0.0)
            for symbol, data in portfolio.get("assets", {}).items()
            if data.get("current_value", 0.0) > 0
        }
        return {"allocation": allocation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades/markers/{symbol}")
async def get_trade_markers(symbol: str = "BTCUSDT"):
    """특정 심볼의 거래 마커 데이터 조회 (차트용)"""
    try:
        markers = await trade_tracker_db.get_trade_markers(symbol)
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
        positions = await position_service.get_open_positions(symbol)
        return {"positions": positions, "count": len(positions)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/closed")
async def get_closed_positions(symbol: Optional[str] = None, limit: int = 50):
    """닫힌 포지션 조회"""
    try:
        positions = await position_service.get_closed_positions(symbol, limit)
        return {"positions": positions, "count": len(positions)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/summary")
async def get_positions_summary(symbol: Optional[str] = None):
    """포지션 요약 및 통계"""
    try:
        summary = await position_service.get_position_summary(symbol)
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/{position_id}")
async def get_position_details(position_id: str):
    """특정 포지션 상세 정보"""
    try:
        position = await position_service.get_position_by_id(position_id)
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
        open_positions = await position_service.get_open_positions()
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
        open_positions = await position_service.get_open_positions(symbol)
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
            max_days_open=max_days_open,
            trading_client=trading_client,
        )
        
        return {
            "success": True,
            "closed_positions": len(results),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
