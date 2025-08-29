from datetime import datetime
from typing import Dict, List, Any
import json
import os

class TradeTracker:
    def __init__(self, data_file: str = "./trade_positions.json"):
        self.data_file = data_file
        self.positions = self._load_positions()
        print(f"📁 TradeTracker 초기화: {self.data_file} (기존 신호: {len(self.positions)}개)")
    
    def _load_positions(self) -> List[Dict]:
        """파일에서 포지션 데이터 로드"""
        try:
            if not os.path.exists(self.data_file):
                print(f"📄 신호 파일이 없어 새로 생성: {self.data_file}")
                return []
                
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                print(f"📄 신호 파일 로드 완료: {len(data)}개 기존 신호")
                return data
        except FileNotFoundError:
            print(f"📄 신호 파일이 없어 새로 생성: {self.data_file}")
            return []
        except Exception as e:
            print(f"❌ 포지션 로드 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _save_positions(self):
        """포지션 데이터를 파일에 저장"""
        try:
            # 디렉터리가 없으면 생성
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            
            with open(self.data_file, 'w') as f:
                json.dump(self.positions, f, indent=2, ensure_ascii=False)
            
            print(f"💾 신호 저장 완료: {self.data_file} ({len(self.positions)}개 신호)")
        except Exception as e:
            print(f"❌ 포지션 저장 오류: {e}")
            import traceback
            traceback.print_exc()
    
    def add_trade(self, symbol: str, side: str, qty: float, price: float, signal: str = None):
        """거래 기록 추가"""
        trade = {
            "id": f"trade_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "side": side,  # Buy or Sell
            "quantity": qty,
            "price": price,
            "signal": signal,  # 매매 신호 (buy, sell, manual, hold)
            "total_value": qty * price
        }
        
        self.positions.append(trade)
        self._save_positions()
        
        print(f"📝 신호 추가됨: {signal} ({side}) - 총 {len(self.positions)}개 신호 저장됨")
        
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
    
    def get_trade_signals(self, limit: int = 5) -> List[Dict]:
        """최근 거래 신호 조회 (기본 5개)"""
        signals = [
            trade for trade in self.positions 
            if trade.get("signal") and trade["signal"] != "manual"
        ]
        
        sorted_signals = sorted(signals, key=lambda x: x["timestamp"], reverse=True)[:limit]
        print(f"📊 신호 조회: 전체 {len(signals)}개 중 최신 {len(sorted_signals)}개 반환")
        
        return sorted_signals
    
    def add_test_signal(self, symbol: str = "BTCUSDT", signal_type: str = "buy"):
        """테스트 신호 추가 (개발용)"""
        import random
        
        if signal_type == "hold":
            test_signal = {
                "id": f"signal_{datetime.now().timestamp()}",
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "side": "Hold",
                "quantity": 0.0,  # 보류 신호는 거래량 0
                "price": round(random.uniform(100000, 120000), 2),
                "signal": signal_type
            }
        else:
            test_signal = {
                "id": f"signal_{datetime.now().timestamp()}",
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "side": "Buy" if signal_type == "buy" else "Sell",
                "quantity": round(random.uniform(0.001, 0.01), 6),
                "price": round(random.uniform(100000, 120000), 2),
                "signal": signal_type
            }
        
        self.positions.append(test_signal)
        self._save_positions()
        
        print(f"🧪 테스트 신호 추가됨: {signal_type} - 총 {len(self.positions)}개 신호 저장됨")
        
        return test_signal