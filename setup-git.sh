#!/bin/bash

echo "🔧 Git 저장소 설정 중..."

# Git 초기화 (이미 되어있다면 스킵)
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git 저장소 초기화 완료"
else
    echo "ℹ️  Git 저장소가 이미 존재합니다"
fi

# .env 파일들 생성 (예제에서 복사)
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "📝 backend/.env 파일 생성됨 - API 키를 설정하세요!"
fi

if [ ! -f "frontend/.env.local" ]; then
    cp frontend/.env.example frontend/.env.local
    echo "📝 frontend/.env.local 파일 생성됨"
fi

# Git 설정 확인
echo ""
echo "🔍 현재 Git 상태:"
git status

echo ""
echo "📋 다음 단계:"
echo "1. backend/.env 파일에 Bybit API 키 설정"
echo "2. git add ."
echo "3. git commit -m 'Initial commit: Bitcoin auto-trading system'"
echo "4. git remote add origin <your-repo-url>"
echo "5. git push -u origin main"