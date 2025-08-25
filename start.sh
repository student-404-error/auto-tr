#!/bin/bash

echo "🚀 Bitcoin Auto-Trading System 시작"

# 환경 변수 파일 확인
if [ ! -f backend/.env ]; then
    echo "⚠️  backend/.env 파일이 없습니다. .env.example을 복사해서 설정하세요."
    cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env.local ]; then
    echo "⚠️  frontend/.env.local 파일이 없습니다. .env.example을 복사해서 설정하세요."
    cp frontend/.env.example frontend/.env.local
fi

# 백엔드 의존성 설치 및 실행
echo "📦 백엔드 의존성 설치 중..."
pip install -r requirements.txt
cd backend

echo "🔧 백엔드 서버 시작 중..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 프론트엔드 의존성 설치 및 실행
echo "📦 프론트엔드 의존성 설치 중..."
cd ../frontend
npm install

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
