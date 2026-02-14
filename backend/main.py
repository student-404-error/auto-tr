from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

from api.routes import router, trade_tracker
from trading.bybit_client import BybitClient
from trading.simple_strategy import TradingStrategy

app = FastAPI(title="Bitcoin Auto-Trading API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """앱 시작시 초기화"""

    # Bybit 클라이언트 초기화
    app.state.trading_client = BybitClient()
    app.state.trade_tracker = trade_tracker
    app.state.trading_strategy = TradingStrategy(
        app.state.trading_client, trade_tracker
    )

    logger.info("🚀 Bitcoin Auto-Trading System 시작됨")
    logger.info("📡 REST API 준비됨")


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

