# Backend - Bitcoin Auto-Trading API

## 환경 설정

1. `.env` 파일 생성:
```bash
cp .env.example .env
```

2. Bybit API 키 설정:
```env
BYBIT_API_KEY=your_api_key_here
BYBIT_API_SECRET=your_api_secret_here
BYBIT_TESTNET=true  # 테스트넷 사용 (실제 거래 전까지)
```

## 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload
```

## API 문서

서버 실행 후 http://localhost:8000/docs 에서 확인

## 주요 파일

- `main.py`: FastAPI 서버 메인
- `trading/bybit_client.py`: Bybit API 클라이언트
- `trading/strategy.py`: 자동매매 전략 (고급)
- `trading/simple_strategy.py`: 간단한 전략
- `api/routes.py`: REST API 엔드포인트

## 퀀트 시계열 적재 파이프라인 (SQLite)

원천(raw)과 파생(feature) 데이터를 분리해 `quant_timeseries.db`로 적재합니다.

### 테이블 구성
- Raw: `raw_ohlcv`, `raw_ticker`, `raw_orderbook_top`, `raw_public_trades`, `raw_funding_rates`, `raw_open_interest`
- Feature: `feature_bar` (수익률, 변동성, ATR, EMA, z-score)
- 운영: `pipeline_runs`

### 실행
```bash
cd backend
python -m pipeline.run_quant_pipeline --once
python -m pipeline.run_quant_pipeline
```

### 환경변수
```env
QUANT_DB_PATH=./data/quant_timeseries.db
DATA_PIPELINE_SYMBOLS=BTCUSDT,XRPUSDT,SOLUSDT
DATA_PIPELINE_INTERVALS=1,5,15,60
DATA_PIPELINE_SLEEP_SEC=60
```
