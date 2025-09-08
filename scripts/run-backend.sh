#!/bin/bash

echo "🚀 백엔드 서버 시작 (간단 버전)"

cd backend

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo "⚠️  .env 파일이 없습니다. .env.example을 복사해서 설정하세요."
    cp .env.example .env
fi

# 간단한 의존성만 설치
echo "📦 필수 패키지 설치 중..."
pip install fastapi uvicorn pybit python-dotenv websockets python-multipart pydantic schedule

echo "🔧 백엔드 서버 시작 중..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload