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