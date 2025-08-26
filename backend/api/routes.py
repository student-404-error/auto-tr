from fastapi import APIRouter, HTTPException, Request
import asyncio
from models.portfolio_history import PortfolioHistory
from models.trade_tracker import TradeTracker

router = APIRouter()

# 글로벌 인스턴스
portfolio_history = PortfolioHistory()
trade_tracker = TradeTracker()


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
    """포트폴리오 현황 조회"""
    trading_client = get_trading_client(request)

    try:
        balance = await trading_client.get_balance()
        current_price = await trading_client.get_current_price()

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
            "timestamp": asyncio.get_event_loop().time(),
        }
        
        # 포트폴리오 히스토리에 스냅샷 추가
        portfolio_history.add_snapshot(portfolio_data)
        
        # 수익률 통계 추가
        performance_stats = portfolio_history.get_performance_stats()
        portfolio_data.update(performance_stats)
        
        # BTC 포지션 정보 추가
        btc_pnl = trade_tracker.get_pnl("BTCUSDT", current_price)
        portfolio_data["btc_position"] = btc_pnl
        
        return portfolio_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades")
async def get_trade_history(request: Request):
    """거래 내역 조회"""
    trading_client = get_trading_client(request)

    try:
        trades = await trading_client.get_order_history()
        return {"trades": trades}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
async def start_trading(request: Request):
    """자동매매 시작"""
    trading_strategy = get_trading_strategy(request)

    if trading_strategy.is_active:
        return {"message": "Trading is already active"}

    asyncio.create_task(trading_strategy.start_trading())
    return {"message": "Auto-trading started"}


@router.post("/trading/stop")
async def stop_trading(request: Request):
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
):
    """수동 주문"""
    trading_client = get_trading_client(request)

    try:
        result = await trading_client.place_order(symbol, side, "Market", qty)
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
        positions = trade_tracker.get_current_positions()
        return {"positions": positions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signals")
async def get_recent_signals(limit: int = 10):
    """최근 거래 신호 조회"""
    try:
        signals = trade_tracker.get_trade_signals(limit)
        return {"signals": signals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pnl/{symbol}")
async def get_pnl(request: Request, symbol: str = "BTCUSDT"):
    """특정 심볼의 손익 조회"""
    trading_client = get_trading_client(request)
    
    try:
        current_price = await trading_client.get_current_price(symbol)
        pnl_data = trade_tracker.get_pnl(symbol, current_price)
        return pnl_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))