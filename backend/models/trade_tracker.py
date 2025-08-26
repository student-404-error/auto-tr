from datetime import datetime
from typing import Dict, List, Any
import json
import os

class TradeTracker:
    def __init__(self, data_file: str = "trade_positions.json"):
        self.data_file = data_file
        self.positions = self._load_positions()
    
    def _load_positions(self) -> List[Dict]:
        """포지션 데이터 로드"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_positions(self):
        """포지션 데이터 저장"""
        with open(self.data_file, 'w') as f:
            json.dump(self.positions, f, indent=2)
    
    def add_trade(self, symbol: str, side: str, qty: float, price: float, signal: str = None):
        """거래 기록 추가"""
        trade = {
            "id": f"trade_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "side": side,  # Buy or Sell
            "quantity": qty,
            "price": price,
            "signal": signal,  # 매매 신호 (buy, sell, manual)
            "total_value": qty * price
        }
        
        self.positions.append(trade)
        self._save_positions()
        
        return trade
    
    def get_current_positions(self) -> Dict[str, Any]:
        """현재 보유 포지션 계산"""
        positions = {}
        
        for trade in self.positions:
            symbol = trade["symbol"]
            
            if symbol not in positions:
                positions[symbol] = {
                    "symbol": symbol,
                    "total_quantity": 0,
                    "average_price": 0,
                    "total_invested": 0,
                    "trades": []
                }
            
            if trade["side"] == "Buy":
                positions[symbol]["total_quantity"] += trade["quantity"]
                positions[symbol]["total_invested"] += trade["total_value"]
            else:  # Sell
                positions[symbol]["total_quantity"] -= trade["quantity"]
                positions[symbol]["total_invested"] -= trade["total_value"]
            
            positions[symbol]["trades"].append(trade)
        
        # 평균 매수가 계산
        for symbol, pos in positions.items():
            if pos["total_quantity"] > 0:
                pos["average_price"] = pos["total_invested"] / pos["total_quantity"]
            else:
                pos["average_price"] = 0
        
        return positions
    
    def get_pnl(self, symbol: str, current_price: float) -> Dict[str, Any]:
        """손익 계산"""
        positions = self.get_current_positions()
        
        if symbol not in positions or positions[symbol]["total_quantity"] <= 0:
            return {
                "unrealized_pnl": 0,
                "unrealized_pnl_percent": 0,
                "average_price": 0,
                "current_price": current_price,
                "quantity": 0
            }
        
        pos = positions[symbol]
        current_value = pos["total_quantity"] * current_price
        invested_value = pos["total_invested"]
        
        unrealized_pnl = current_value - invested_value
        unrealized_pnl_percent = (unrealized_pnl / invested_value * 100) if invested_value > 0 else 0
        
        return {
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": unrealized_pnl_percent,
            "average_price": pos["average_price"],
            "current_price": current_price,
            "quantity": pos["total_quantity"],
            "invested_value": invested_value,
            "current_value": current_value
        }
    
    def get_trade_signals(self, limit: int = 10) -> List[Dict]:
        """최근 거래 신호 조회"""
        signals = [
            trade for trade in self.positions 
            if trade.get("signal") and trade["signal"] != "manual"
        ]
        
        return sorted(signals, key=lambda x: x["timestamp"], reverse=True)[:limit]