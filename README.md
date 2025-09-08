# Bitcoin Auto-Trading System & Dashboard

비트코인 자동매매 시스템과 개인 지갑 대시보드

## 프로젝트 구조

```
├── backend/          # Python FastAPI 백엔드
│   ├── trading/      # 자동매매 로직
│   ├── api/          # REST API 엔드포인트
│   └── models/       # 데이터 모델
├── frontend/         # Next.js 프론트엔드
│   ├── components/   # React 컴포넌트
│   ├── pages/        # 페이지
│   └── utils/        # 유틸리티
├── scripts/          # 실행 및 설정 스크립트
├── docs/             # 프로젝트 문서
├── data/             # 데이터 파일
└── docker-compose.yml # 배포용
```

## 기술 스택

### 백엔드
- Python 3.11+
- FastAPI
- Bybit API
- SQLite/PostgreSQL
- WebSocket (실시간 데이터)

### 프론트엔드
- Next.js 14
- TypeScript
- Tailwind CSS
- Chart.js/Recharts (차트)

## 주요 기능

1. **자동매매 시스템**
   - Bybit API 연동
   - 기술적 분석 기반 매매 전략
   - 24시간 자동 실행
   - 안전 장치 (최대 거래 금액, 손절매)

2. **대시보드**
   - 실시간 포트폴리오 현황
   - 거래 내역 및 수익률
   - 차트 및 분석 도구

## 🚀 빠른 시작

### 1. 초기 설정
```bash
# 프로젝트 의존성 설치
bash scripts/setup.sh

# Git 저장소 설정 (처음만)
bash scripts/git-setup.sh
```

### 2. 개발 서버 실행
```bash
# 전체 시스템 시작
bash scripts/start.sh
```

### 3. 접속
- 🌐 프론트엔드: http://localhost:3000
- 🔗 백엔드 API: http://localhost:8000
- 📚 API 문서: http://localhost:8000/docs

## 🚨 실제 거래 설정 (30달러 예산)

### 1. Bybit API 키 발급
1. [Bybit](https://www.bybit.com) 계정 생성
2. API Management에서 API 키 생성
3. 권한 설정: Spot Trading 활성화
4. IP 제한 설정 (보안 강화)

### 2. 환경 변수 설정
```bash
# backend/.env 파일 수정
BYBIT_API_KEY=your_actual_api_key
BYBIT_API_SECRET=your_actual_api_secret
BYBIT_TESTNET=false

# 안전 거래 설정 (30달러 예산)
MAX_TRADE_AMOUNT_USD=30.0
MIN_ORDER_SIZE_USD=5.0
MAX_POSITION_PERCENTAGE=80.0
STOP_LOSS_PERCENTAGE=5.0
```

### 3. 안전 장치
- **최대 거래 금액**: $30 (설정 가능)
- **최소 주문 크기**: $5
- **최대 포지션 비율**: 80% (잔고의 80%까지만 사용)
- **손절매**: 5% 손실 시 자동 매도

### 4. 주의사항
⚠️ **실제 자금 손실 위험이 있습니다**
- 소액으로 테스트 후 점진적 확대
- 시장 변동성에 따른 손실 가능
- 24시간 모니터링 권장
- 전략 백테스팅 후 사용