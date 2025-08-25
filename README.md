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

2. **대시보드**
   - 실시간 포트폴리오 현황
   - 거래 내역 및 수익률
   - 차트 및 분석 도구