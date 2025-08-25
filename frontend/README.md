# Frontend - Bitcoin Trading Dashboard

Next.js + TypeScript + Tailwind CSS로 구축된 비트코인 자동매매 대시보드

## 환경 설정

1. `.env.local` 파일 생성:
```bash
cp .env.example .env.local
```

2. API URL 설정:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 주요 기능

- 실시간 포트폴리오 현황
- 자동매매 컨트롤
- 가격 차트 (Recharts)
- 거래 내역 조회
- 다크 테마 UI

## 주요 파일

- `app/page.tsx`: 메인 페이지
- `components/Dashboard.tsx`: 대시보드 메인
- `contexts/TradingContext.tsx`: 상태 관리
- `utils/api.ts`: API 클라이언트
- `app/globals.css`: 글로벌 스타일