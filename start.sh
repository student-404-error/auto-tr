#!/bin/bash

echo "🚀 Bitcoin Auto-Trading System 시작"

# 개발 서버 실행만 수행 (사전 의존성 설치와 환경 설정은 setup.sh 사용)

# 백엔드 실행
cd backend
echo "🔧 백엔드 서버 시작 중..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 프론트엔드 실행
cd ../frontend
echo "🎨 프론트엔드 서버 시작 중..."
npm run dev &
FRONTEND_PID=$!

echo "✅ 시스템이 시작되었습니다!"
echo "🌐 프론트엔드: http://localhost:3000"
echo "🔗 백엔드 API: http://localhost:8000"
echo "📚 API 문서: http://localhost:8000/docs"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."

# 종료 시그널 처리
trap 'echo "🛑 시스템 종료 중..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# 프로세스 대기
wait
