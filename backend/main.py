from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from datetime import datetime
from typing import Dict, Any

from api.routes import router
from trading.bybit_client import BybitClient
from trading.simple_strategy import TradingStrategy

app = FastAPI(title="Bitcoin Auto-Trading API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: list[WebSocket] = []


@app.on_event("startup")
async def startup_event():
    """앱 시작시 초기화"""

    # Bybit 클라이언트 초기화
    app.state.trading_client = BybitClient()
    app.state.trading_strategy = TradingStrategy(app.state.trading_client)

    print("🚀 Bitcoin Auto-Trading System 시작됨")


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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """실시간 데이터 WebSocket"""
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            trading_client = getattr(app.state, "trading_client", None)
            data = {
                "timestamp": datetime.now().isoformat(),
                "price": await trading_client.get_current_price() if trading_client else 0,
                "balance": await trading_client.get_balance() if trading_client else {},
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1)  # 1초마다 업데이트

    except Exception as e:
        print(f"WebSocket 연결 오류: {e}")
    finally:
        active_connections.remove(websocket)


# API 라우터 포함
app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

