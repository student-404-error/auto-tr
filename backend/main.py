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

from api.routes import router, trade_tracker, trade_tracker_db
from trading.bybit_client import BybitClient
from trading.simple_strategy import TradingStrategy as SimpleTradingStrategy
from trading.regime_trend_strategy import RegimeTrendStrategy
from trading.strategy_params import RegimeTrendParams
from fastapi.responses import HTMLResponse

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
app.include_router(router)          # /portfolio, /trading/... 바로 접근
app.include_router(router, prefix="/api")  # 구 버전 호환


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page():
    """간단한 웹 대시보드(백엔드 단독 뷰)."""
    return """
    <!doctype html>
    <html lang="ko">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Auto-Trading Dashboard</title>
      <style>
        :root { color-scheme: light dark; }
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; }
        h1 { margin: 0 0 12px; }
        .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .muted { color: #94a3b8; font-size: 13px; }
        .value { font-size: 24px; font-weight: 700; }
        button { background: #22c55e; border: none; color: #0b1220; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-weight: 600; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        a { color: #38bdf8; text-decoration: none; }
        .log { max-height: 180px; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background:#0b1220; border-radius:10px; padding:10px; }
      </style>
    </head>
    <body>
      <h1>Auto-Trading Dashboard</h1>
      <div class="grid">
        <div class="card">
          <div class="muted">포트폴리오 가치</div>
          <div class="value" id="totalValue">--</div>
          <div class="muted" id="btcPrice">BTC --</div>
        </div>
        <div class="card">
          <div class="muted">상태</div>
          <div class="value" id="status">--</div>
          <div class="muted" id="lastUpdate">업데이트 대기</div>
        </div>
        <div class="card">
          <div class="muted">컨트롤</div>
          <button id="startBtn">자동매매 시작</button>
          <button id="stopBtn" style="margin-left:8px;background:#f97316;">중지</button>
          <div class="muted" style="margin-top:8px;">보안용 X-API-KEY가 필요한 엔드포인트는 Postman/브라우저 fetch로 호출하세요.</div>
        </div>
      </div>
      <h3 style="margin-top:20px;">이벤트 로그</h3>
      <div class="log" id="logBox"></div>
      <script>
        const log = (msg) => {
          const box = document.getElementById('logBox');
          box.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}<br>` + box.innerHTML;
        };
        async function fetchPortfolio() {
          try {
            const res = await fetch('/portfolio');
            const data = await res.json();
            document.getElementById('totalValue').innerText = `$${(data.total_value_usd||0).toFixed(2)}`;
            document.getElementById('btcPrice').innerText = `BTC $${(data.current_btc_price||0).toFixed(2)}`;
            document.getElementById('status').innerText = data.trading_active ? 'ACTIVE' : 'IDLE';
            document.getElementById('lastUpdate').innerText = new Date().toLocaleString();
            log('포트폴리오 갱신 완료');
          } catch (e) { log('포트폴리오 조회 실패: ' + e); }
        }
        document.getElementById('startBtn').onclick = async () => {
          log('자동매매 시작 요청 (X-API-KEY 필요)'); 
          alert('start/stop는 X-API-KEY 헤더가 필요한 POST입니다. 브라우저에서 직접 호출 시 CORS/헤더 제약이 있으니 Postman/터미널에서 실행하세요.');
        };
        document.getElementById('stopBtn').onclick = async () => {
          log('자동매매 중지 요청 (X-API-KEY 필요)');
          alert('start/stop는 X-API-KEY 헤더가 필요한 POST입니다.');
        };
        fetchPortfolio(); setInterval(fetchPortfolio, 10000);
      </script>
    </body>
    </html>
    """
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
