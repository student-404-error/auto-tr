from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from dotenv import load_dotenv
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

from api.routes import router, trade_tracker_db
from trading.bybit_client import BybitClient
from trading.simple_strategy import TradingStrategy as SimpleTradingStrategy
from trading.regime_trend_strategy import RegimeTrendStrategy
from trading.strategy_params import RegimeTrendParams

app = FastAPI(title="Bitcoin Auto-Trading API", version="1.0.0")

# CORS 설정
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://autotr.vercel.app",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """앱 시작시 초기화"""

    # Bybit 클라이언트 초기화
    app.state.trading_client = BybitClient()
    app.state.trade_tracker = trade_tracker_db
    strategy_name = os.getenv("TRADING_STRATEGY", "regime_trend").lower()

    if strategy_name == "simple":
        app.state.trading_strategy = SimpleTradingStrategy(
            app.state.trading_client, trade_tracker_db
        )
    else:
        params = RegimeTrendParams(
            symbol=os.getenv("STRATEGY_SYMBOL", "BTCUSDT"),
            interval=os.getenv("STRATEGY_INTERVAL", "15"),
            lookback_bars=int(os.getenv("STRATEGY_LOOKBACK_BARS", "260")),
            ema_fast_period=int(os.getenv("STRATEGY_EMA_FAST", "50")),
            ema_slow_period=int(os.getenv("STRATEGY_EMA_SLOW", "200")),
            min_trend_gap_pct=float(os.getenv("STRATEGY_MIN_TREND_GAP_PCT", "0.001")),
            atr_period=int(os.getenv("STRATEGY_ATR_PERIOD", "14")),
            initial_stop_atr_mult=float(os.getenv("STRATEGY_INITIAL_STOP_ATR_MULT", "2.5")),
            trailing_stop_atr_mult=float(os.getenv("STRATEGY_TRAILING_STOP_ATR_MULT", "3.0")),
            loop_seconds=int(os.getenv("STRATEGY_LOOP_SECONDS", "60")),
            cooldown_bars=int(os.getenv("STRATEGY_COOLDOWN_BARS", "2")),
        )
        app.state.trading_strategy = RegimeTrendStrategy(
            app.state.trading_client,
            trade_tracker_db,
            params=params,
        )

    logger.info("🚀 Bitcoin Auto-Trading System 시작됨")
    logger.info("📡 REST API 준비됨")
    logger.info("🧠 Trading strategy selected: %s", strategy_name)


@app.get("/")
async def root():
    return {"message": "Bitcoin Auto-Trading API", "status": "running"}


@app.get("/api/status")
async def get_status():
    """시스템 상태 조회"""
    trading_strategy = getattr(app.state, "trading_strategy", None)
    return {
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "trading_active": trading_strategy.is_active if trading_strategy else False,
    }


# API 라우터 포함
app.include_router(router)
app.include_router(router, prefix="/api")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
