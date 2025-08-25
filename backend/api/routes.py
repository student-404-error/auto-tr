from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import asyncio

router = APIRouter()

# 전역 변수 (main.py에서 설정됨)
trading_client = None
trading_strategy = None

@router.get("/portfolio")
async def get_portfolio():
    """포트폴리오 현황 조회"""
    if not trading_client:
        raise HTTPException(status_code=500, detail="Trading client not initialized")
    
    try:
        balance = await trading_client.get_balance()
        current_price = await trading_client.get_current_price()
        
        # 총 자산 계산
        total_usd = 0
        for coin, data in balance.items():
            if coin == "BTC":
                total_usd += data["balance"] * current_price
            elif coin == "USDT":
                total_usd += data["balance"]
        
        return {
            "balances": balance,
            "current_btc_price": current_price,
            "total_value_usd": total_usd,
            "timestamp": asyncio.get_event_loop().time()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trades")
async def get_trade_history():
    """거래 내역 조회"""
    if not trading_client:
        raise HTTPException(status_code=500, detail="Trading client not initialized")
    
    try:
        trades = await trading_client.get_order_history()
        return {"trades": trades}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/price/{symbol}")
async def get_price(symbol: str = "BTCUSDT"):
    """특정 심볼 가격 조회"""
    if not trading_client:
        raise HTTPException(status_code=500, detail="Trading client not initialized")
    
    try:
        price = await trading_client.get_current_price(symbol)
        return {"symbol": symbol, "price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart/{symbol}")
async def get_chart_data(symbol: str = "BTCUSDT", interval: str = "1", limit: int = 100):
    """차트 데이터 조회"""
    if not trading_client:
        raise HTTPException(status_code=500, detail="Trading client not initialized")
    
    try:
        kline_data = await trading_client.get_kline_data(symbol, interval, limit)
        
        # 차트 형식으로 변환
        chart_data = []
        for kline in kline_data:
            chart_data.append({
                "timestamp": int(kline[0]),
                "open": float(kline[1]),
                "high": float(kline[2]),
                "low": float(kline[3]),
                "close": float(kline[4]),
                "volume": float(kline[5])
            })
        
        return {"symbol": symbol, "data": chart_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trading/start")
async def start_trading():
    """자동매매 시작"""
    if not trading_strategy:
        raise HTTPException(status_code=500, detail="Trading strategy not initialized")
    
    if trading_strategy.is_active:
        return {"message": "Trading is already active"}
    
    # 백그라운드에서 실행
    asyncio.create_task(trading_strategy.start_trading())
    return {"message": "Auto-trading started"}

@router.post("/trading/stop")
async def stop_trading():
    """자동매매 중지"""
    if not trading_strategy:
        raise HTTPException(status_code=500, detail="Trading strategy not initialized")
    
    trading_strategy.stop_trading()
    return {"message": "Auto-trading stopped"}

@router.get("/trading/status")
async def get_trading_status():
    """자동매매 상태 조회"""
    if not trading_strategy:
        raise HTTPException(status_code=500, detail="Trading strategy not initialized")
    
    return trading_strategy.get_strategy_status()

@router.post("/order")
async def place_manual_order(
    symbol: str = "BTCUSDT",
    side: str = "Buy",
    qty: str = "0.001"
):
    """수동 주문"""
    if not trading_client:
        raise HTTPException(status_code=500, detail="Trading client not initialized")
    
    try:
        result = await trading_client.place_order(symbol, side, "Market", qty)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))