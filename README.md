# Auto Trading Portfolio Project

Bybit 기반 자동매매 시스템과 운영 대시보드를 구축한 프로젝트입니다.  
핵심 목표는 `실거래 가능한 자동매매 엔진`, `24/7 운영 환경`, `퀀트 분석용 시계열 데이터 적재`입니다.

## 1. Project Summary

- 프로젝트명: `Auto-Tr`
- 기간: 2025 ~ 진행 중
- 목적:
  - 소액 실전 기반 자동매매 운영
  - 전략 실험/확장을 위한 데이터 파이프라인 구축
  - 운영 관점(재시작, 로그, 배포)까지 포함한 End-to-End 구현

## 2. Problem & Approach

- 문제:
  - 로컬 환경에서는 장시간 안정 운영이 어려움
  - 프론트/백엔드 분리 배포 시 CORS, HTTPS, API 경로 이슈가 잦음
  - 거래 데이터가 파일(JSON) 기반이면 동시성/무결성에 취약함
- 접근:
  - `FastAPI + systemd`로 백엔드 상시 운영
  - `Vercel(Frontend) + EC2(Backend)` 분리 배포
  - `SQLite` 중심으로 거래/시계열 데이터 적재
  - 전략 로직과 백테스트 인터페이스를 분리해 확장성 확보

## 3. Tech Stack

- Backend: `Python`, `FastAPI`, `pybit`, `SQLite`, `systemd`
- Frontend: `Next.js 14`, `TypeScript`, `Tailwind`, `Recharts`
- Infra: `AWS EC2 (Ubuntu)`, `Nginx`, `Certbot`, `Vercel`

## 4. Architecture

```text
Vercel Frontend (autotr.vercel.app)
  -> HTTPS API call
EC2 Backend (FastAPI + systemd, api.dataquantlab.com)
  -> Bybit REST API
  -> SQLite (trades.db / quant_timeseries.db)
```

## 5. Key Features

### Trading Engine
- Bybit API 연동 (주문/잔고/시세)
- 자동매매 시작/중지 제어 (`X-API-KEY`)
- 리스크 제한(최대 주문금액, 최소 주문금액, 포지션 비율)
- 전략 선택:
  - `simple` (기존)
  - `regime_trend` (EMA 레짐 + ATR 리스크 관리)

### Dashboard
- 포트폴리오 요약/포지션 현황
- 지갑 파이차트
- 보유 코인 차트
- 코인별 손익률
- 거래 내역
- RUNNING/STOPPED 상태 배지

### Quant Data Pipeline
- 원천(raw) / 파생(feature) 테이블 분리
- 수집 대상:
  - `raw_ohlcv`, `raw_ticker`, `raw_orderbook_top`
  - `raw_public_trades`, `raw_funding_rates`, `raw_open_interest`
- 파생 지표:
  - `ret_1`, `ret_log_1`, `vol_20`
  - `atr_14`, `ema_fast_50`, `ema_slow_200`, `trend_gap_pct`, `zscore_50`

## 6. Data Model (SQLite)

- 거래 기록: `backend/data/trades.db`
- 퀀트 시계열: `backend/data/quant_timeseries.db`
- 특징:
  - PK/Index 기반 중복 방지
  - Append + Upsert 중심 설계
  - 파이프라인 실행 로그(`pipeline_runs`)로 운영 추적

## 7. Deployment & Operations

### Backend (EC2)
- `auto-tr-api.service`: FastAPI
- `auto-tr-pipeline.service`: 시계열 수집 파이프라인
- `Restart=always` 기반 자동 복구

### Frontend (Vercel)
- 환경변수:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.dataquantlab.com`

## 8. Project Structure

```text
backend/
  api/                 # REST endpoints
  trading/             # strategy/client
  pipeline/            # quant data ingestion
  backtest/            # strategy backtest interface
  models/              # tracking/persistence models
frontend/
  app/                 # Next.js app router
  components/          # dashboard UI
  services/            # API service layer
docs/                  # implementation notes
```

## 9. What I Improved

- JSON 중심 기록 구조의 취약점 식별 후 SQLite 전환
- 프론트 상대경로 호출 이슈(`/api/...` 404) 수정
- Vercel-EC2 연동 시 CORS/HTTPS 병목 해결
- 전략 구현을 실거래/백테스트 인터페이스로 분리

## 10. Next Steps

- WebSocket 기반 저지연 데이터 수집 확장
- 포트폴리오/전략 성과 리포팅 자동화
- 리스크 엔진 고도화(포지션 레벨 한도, 일손실 컷오프)
