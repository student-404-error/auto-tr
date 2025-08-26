from datetime import datetime, timedelta
from typing import Dict, List, Any
import json
import os

class PortfolioHistory:
    def __init__(self, data_file: str = "portfolio_history.json"):
        self.data_file = data_file
        self.history = self._load_history()
    
    def _load_history(self) -> List[Dict]:
        """히스토리 데이터 로드"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_history(self):
        """히스토리 데이터 저장"""
        with open(self.data_file, 'w') as f:
            json.dump(self.history, f, indent=2)
    
    def add_snapshot(self, portfolio_data: Dict[str, Any]):
        """포트폴리오 스냅샷 추가"""
        snapshot = {
            "timestamp": datetime.now().isoformat(),
            "total_value_usd": portfolio_data.get("total_value_usd", 0),
            "balances": portfolio_data.get("balances", {}),
            "btc_price": portfolio_data.get("current_btc_price", 0)
        }
        
        self.history.append(snapshot)
        
        # 30일 이상 된 데이터는 삭제
        cutoff_date = datetime.now() - timedelta(days=30)
        self.history = [
            h for h in self.history 
            if datetime.fromisoformat(h["timestamp"]) > cutoff_date
        ]
        
        self._save_history()
    
    def get_history(self, period: str = "7d") -> List[Dict]:
        """기간별 히스토리 조회"""
        if period == "1d":
            cutoff = datetime.now() - timedelta(days=1)
        elif period == "7d":
            cutoff = datetime.now() - timedelta(days=7)
        elif period == "30d":
            cutoff = datetime.now() - timedelta(days=30)
        else:
            cutoff = datetime.now() - timedelta(days=7)
        
        return [
            h for h in self.history 
            if datetime.fromisoformat(h["timestamp"]) > cutoff
        ]
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """수익률 통계 계산"""
        if len(self.history) < 2:
            return {
                "daily_change": 0,
                "weekly_change": 0,
                "monthly_change": 0,
                "daily_change_percent": 0,
                "weekly_change_percent": 0,
                "monthly_change_percent": 0
            }
        
        current = self.history[-1]["total_value_usd"]
        
        # 일간 변화
        day_ago = datetime.now() - timedelta(days=1)
        daily_data = [h for h in self.history if datetime.fromisoformat(h["timestamp"]) > day_ago]
        daily_start = daily_data[0]["total_value_usd"] if daily_data else current
        
        # 주간 변화
        week_ago = datetime.now() - timedelta(days=7)
        weekly_data = [h for h in self.history if datetime.fromisoformat(h["timestamp"]) > week_ago]
        weekly_start = weekly_data[0]["total_value_usd"] if weekly_data else current
        
        # 월간 변화
        month_ago = datetime.now() - timedelta(days=30)
        monthly_data = [h for h in self.history if datetime.fromisoformat(h["timestamp"]) > month_ago]
        monthly_start = monthly_data[0]["total_value_usd"] if monthly_data else current
        
        return {
            "daily_change": current - daily_start,
            "weekly_change": current - weekly_start,
            "monthly_change": current - monthly_start,
            "daily_change_percent": ((current - daily_start) / daily_start * 100) if daily_start > 0 else 0,
            "weekly_change_percent": ((current - weekly_start) / weekly_start * 100) if weekly_start > 0 else 0,
            "monthly_change_percent": ((current - monthly_start) / monthly_start * 100) if monthly_start > 0 else 0
        }