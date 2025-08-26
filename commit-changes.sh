#!/bin/bash

echo "📝 Git 커밋 진행 중..."

# Git 상태 확인
git status

echo ""
echo "🔍 변경된 파일들을 스테이징합니다..."

# 모든 변경사항 추가
git add .

echo ""
echo "📋 커밋 메시지와 함께 커밋합니다..."

# 커밋
git commit -m "feat: Add advanced trading dashboard features

- Add portfolio performance tracking with daily/weekly/monthly charts
- Add real-time trading signals display
- Add position tracking with P&L calculation
- Add purchase point indicators on charts
- Add portfolio history and performance statistics
- Implement trade tracker for buy/sell signals
- Add new API endpoints for enhanced data
- Improve UI with performance metrics and position cards

Features added:
✅ Portfolio performance charts (1d/7d/30d)
✅ Real-time P&L display
✅ Trading signals UI (backend integration pending)
✅ Purchase price tracking
✅ Performance statistics
✅ Enhanced dashboard layout"

echo ""
echo "✅ 커밋 완료!"
echo ""
echo "🚀 원격 저장소에 푸시하려면 다음 명령어를 실행하세요:"
echo "git push origin main"