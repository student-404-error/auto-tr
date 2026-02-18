from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from datetime import datetime
from dotenv import load_dotenv
import logging
from slowapi.errors import RateLimitExceeded

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

from api.routes import router, trade_tracker_db
from api.limiter import limiter
from trading.bybit_client import BybitClient
from trading.regime_trend_strategy import RegimeTrendStrategy
from trading.breakout_volume_strategy import BreakoutVolumeStrategy
from trading.mean_reversion_strategy import MeanReversionStrategy
from trading.dual_timeframe_strategy import DualTimeframeStrategy
from trading.strategy_params import (
    RegimeTrendParams,
    BreakoutVolumeParams,
    MeanReversionParams,
    DualTimeframeParams,
)

app = FastAPI(title="Bitcoin Auto-Trading API", version="1.0.0")

# Rate Limiting — api.limiter에서 단일 인스턴스 공유
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."},
    )


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


def build_strategy(strategy_name: str, client: BybitClient):
    """전략 이름으로 전략 인스턴스 생성"""
    symbol = os.getenv("STRATEGY_SYMBOL", "BTCUSDT")
    loop_seconds = int(os.getenv("STRATEGY_LOOP_SECONDS", "60"))

    if strategy_name == "breakout_volume":
        return BreakoutVolumeStrategy(
            client, trade_tracker_db,
            params=BreakoutVolumeParams(symbol=symbol, loop_seconds=loop_seconds),
        )

    if strategy_name == "mean_reversion":
        return MeanReversionStrategy(
            client, trade_tracker_db,
            params=MeanReversionParams(symbol=symbol, loop_seconds=loop_seconds),
        )

    if strategy_name == "dual_timeframe":
        return DualTimeframeStrategy(
            client, trade_tracker_db,
            params=DualTimeframeParams(symbol=symbol, loop_seconds=loop_seconds),
        )

    # 기본: regime_trend
    params = RegimeTrendParams(
        symbol=symbol,
        interval=os.getenv("STRATEGY_INTERVAL", "15"),
        lookback_bars=int(os.getenv("STRATEGY_LOOKBACK_BARS", "260")),
        ema_fast_period=int(os.getenv("STRATEGY_EMA_FAST", "50")),
        ema_slow_period=int(os.getenv("STRATEGY_EMA_SLOW", "200")),
        min_trend_gap_pct=float(os.getenv("STRATEGY_MIN_TREND_GAP_PCT", "0.001")),
        atr_period=int(os.getenv("STRATEGY_ATR_PERIOD", "14")),
        initial_stop_atr_mult=float(os.getenv("STRATEGY_INITIAL_STOP_ATR_MULT", "2.5")),
        trailing_stop_atr_mult=float(os.getenv("STRATEGY_TRAILING_STOP_ATR_MULT", "3.0")),
        loop_seconds=loop_seconds,
        cooldown_bars=int(os.getenv("STRATEGY_COOLDOWN_BARS", "2")),
    )
    return RegimeTrendStrategy(client, trade_tracker_db, params=params)


@app.on_event("startup")
async def startup_event():
    """앱 시작시 초기화"""
    app.state.trading_client = BybitClient()
    app.state.trade_tracker = trade_tracker_db

    strategy_name = os.getenv("TRADING_STRATEGY", "regime_trend").lower()
    app.state.trading_strategy = build_strategy(strategy_name, app.state.trading_client)
    app.state.strategy_task = None
    # 전략 전환 함수를 app.state에 노출
    app.state.build_strategy = build_strategy

    # DB 보관 정책: portfolio_snapshots만 정리 (signal_log는 퀀트 분석용으로 영구 보관)
    deleted_snapshots = await trade_tracker_db.cleanup_old_snapshots(30)
    if deleted_snapshots > 0:
        logger.info("🗑️ DB cleanup: %d old snapshots removed", deleted_snapshots)

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
app.include_router(router, prefix="/api")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
