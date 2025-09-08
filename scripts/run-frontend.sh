#!/bin/bash

echo "🎨 프론트엔드 서버 시작"

cd frontend

# 환경 변수 파일 확인
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local 파일이 없습니다. .env.example을 복사해서 설정하세요."
    cp .env.example .env.local
fi

echo "📦 프론트엔드 의존성 설치 중..."
npm install

echo "🎨 프론트엔드 서버 시작 중..."
npm run dev