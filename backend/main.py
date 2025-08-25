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

# 글로벌 변수
trading_client = None
trading_strategy = None
active_connections: list[WebSocket] = []

@app.on_event("startup")
async def startup_event():
    """앱 시작시 초기화"""
    global trading_client, trading_strategy
    
    # Bybit 클라이언트 초기화
    trading_client = BybitClient()
    trading_strategy = TradingStrategy(trading_client)
    
    print("🚀 Bitcoin Auto-Trading System 시작됨")

@app.get("/")
async def root():
    return {"message": "Bitcoin Auto-Trading API", "status": "running"}

@app.get("/api/status")
async def get_status():
    """시스템 상태 조회"""
    return {
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "trading_active": trading_strategy.is_active if trading_strategy else False
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """실시간 데이터 WebSocket"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # 실시간 데이터 전송
            data = {
                "timestamp": datetime.now().isoformat(),
                "price": await trading_client.get_current_price() if trading_client else 0,
                "balance": await trading_client.get_balance() if trading_client else {}
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