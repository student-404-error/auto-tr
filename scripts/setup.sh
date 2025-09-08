#!/bin/bash

set -e

echo "🧰 Initial setup for Bitcoin Auto-Trading System"

# 1) Ensure environment files exist (non-destructive)
if [ ! -f backend/.env ]; then
  echo "⚠️  backend/.env not found. If available, copying from backend/.env.example"
  if [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
  else
    echo "ℹ️  Create backend/.env with BYBIT_* vars before running."
  fi
fi

if [ ! -f frontend/.env.local ]; then
  echo "⚠️  frontend/.env.local not found. If available, copying from frontend/.env.example"
  if [ -f frontend/.env.example ]; then
    cp frontend/.env.example frontend/.env.local
  else
    echo "ℹ️  Create frontend/.env.local with NEXT_PUBLIC_API_URL before running."
  fi
fi

# 2) Install backend dependencies
echo "📦 Installing backend dependencies..."
pip install -r requirements.txt

# 3) Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd - >/dev/null

echo "✅ Setup complete. Start dev servers with: bash start.sh"

