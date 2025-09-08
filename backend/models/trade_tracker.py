from datetime import datetime
from typing import Dict, List, Any, Optional
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
    
    def add_trade(self, 
                  symbol: str, 
                  side: str, 
                  qty: float, 
                  price: float, 
                  signal: str = None,
                  position_type: str = "spot",
                  dollar_amount: float = None,
                  order_id: str = None,
                  status: str = "filled",
                  fees: float = 0.0):
        """거래 기록 추가 (향상된 버전 - 다중 암호화폐 지원)"""
        
        # 달러 금액 계산 (제공되지 않은 경우)
        if dollar_amount is None:
            dollar_amount = qty * price
        
        trade = {
            "id": order_id or f"trade_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "side": side,  # Buy, Sell, Hold
            "quantity": qty,
            "price": price,
            "signal": signal,  # 매매 신호 (buy, sell, manual, hold)
            "total_value": qty * price,  # 기존 호환성
            # 새로운 필드들
            "dollar_amount": dollar_amount,
            "position_type": position_type,  # spot, long, short
            "status": status,  # pending, filled, cancelled, failed
            "fees": fees
        }
        
        self.positions.append(trade)
        self._save_positions()
        
        print(f"📝 거래 추가: {symbol} {side} {qty} @ ${price:.4f} ({position_type})")
        
        return trade
    
    def get_current_positions(self) -> Dict[str, Any]:
        """현재 보유 포지션 계산 (다중 암호화폐 지원)"""
        positions = {}
        
        for trade in self.positions:
            symbol = trade["symbol"]
            position_type = trade.get("position_type", "spot")
            
            if symbol not in positions:
                positions[symbol] = {}
            
            if position_type not in positions[symbol]:
                positions[symbol][position_type] = {
                    "symbol": symbol,
                    "position_type": position_type,
                    "total_quantity": 0,
                    "average_price": 0,
                    "total_invested": 0,
                    "dollar_amount": 0,
                    "trades": []
                }
            
            pos = positions[symbol][position_type]
            
            if trade["side"] in ["Buy", "buy"]:
                pos["total_quantity"] += trade["quantity"]
                pos["total_invested"] += trade["total_value"]
                pos["dollar_amount"] += trade.get("dollar_amount", trade["total_value"])
            elif trade["side"] in ["Sell", "sell"]:
                pos["total_quantity"] -= trade["quantity"]
                pos["total_invested"] -= trade["total_value"]
                pos["dollar_amount"] -= trade.get("dollar_amount", trade["total_value"])
            
            pos["trades"].append(trade)
        
        # 평균 매수가 계산
        for symbol, symbol_positions in positions.items():
            for position_type, pos in symbol_positions.items():
                if pos["total_quantity"] > 0:
                    pos["average_price"] = pos["total_invested"] / pos["total_quantity"]
                else:
                    pos["average_price"] = 0
        
        return positions
    
    def get_pnl(self, symbol: str, current_price: float, position_type: str = "spot") -> Dict[str, Any]:
        """손익 계산 (포지션 타입 지원)"""
        positions = self.get_current_positions()
        
        if (symbol not in positions or 
            position_type not in positions[symbol] or 
            positions[symbol][position_type]["total_quantity"] <= 0):
            return {
                "unrealized_pnl": 0,
                "unrealized_pnl_percent": 0,
                "average_price": 0,
                "current_price": current_price,
                "quantity": 0,
                "invested_value": 0,
                "current_value": 0,
                "dollar_amount": 0
            }
        
        pos = positions[symbol][position_type]
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
            "current_value": current_value,
            "dollar_amount": pos["dollar_amount"]
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
    
    def get_multi_asset_summary(self) -> Dict[str, Any]:
        """다중 자산 포트폴리오 요약"""
        positions = self.get_current_positions()
        
        summary = {
            "total_symbols": len(positions),
            "total_positions": 0,
            "symbols": {},
            "position_types": {"spot": 0, "long": 0, "short": 0}
        }
        
        for symbol, symbol_positions in positions.items():
            symbol_summary = {
                "total_quantity": 0,
                "total_invested": 0,
                "total_dollar_amount": 0,
                "positions": {}
            }
            
            for position_type, pos in symbol_positions.items():
                if pos["total_quantity"] > 0:
                    summary["total_positions"] += 1
                    summary["position_types"][position_type] += 1
                    
                    symbol_summary["total_quantity"] += pos["total_quantity"]
                    symbol_summary["total_invested"] += pos["total_invested"]
                    symbol_summary["total_dollar_amount"] += pos.get("dollar_amount", 0)
                
                symbol_summary["positions"][position_type] = {
                    "quantity": pos["total_quantity"],
                    "invested": pos["total_invested"],
                    "dollar_amount": pos.get("dollar_amount", 0),
                    "average_price": pos["average_price"]
                }
            
            if symbol_summary["total_quantity"] > 0:
                summary["symbols"][symbol] = symbol_summary
        
        return summary
    
    def get_trades_by_symbol(self, symbol: str, limit: int = 50) -> List[Dict[str, Any]]:
        """특정 심볼의 거래 내역 조회"""
        symbol_trades = [trade for trade in self.positions if trade["symbol"] == symbol]
        sorted_trades = sorted(symbol_trades, key=lambda x: x["timestamp"], reverse=True)
        return sorted_trades[:limit]
    
    def get_position_performance(self, symbol: str, current_prices: Dict[str, float]) -> Dict[str, Any]:
        """특정 심볼의 모든 포지션 성과 계산"""
        if symbol not in current_prices:
            return {}
        
        current_price = current_prices[symbol]
        positions = self.get_current_positions()
        
        if symbol not in positions:
            return {}
        
        performance = {}
        for position_type, pos in positions[symbol].items():
            if pos["total_quantity"] > 0:
                pnl_data = self.get_pnl(symbol, current_price, position_type)
                performance[position_type] = pnl_data
        
        return performance