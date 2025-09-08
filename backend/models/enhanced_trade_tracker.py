from datetime import datetime
from typing import Dict, List, Any, Optional
import json
import os
from enum import Enum

class PositionType(Enum):
    SPOT = "spot"
    LONG = "long"
    SHORT = "short"

class TradeStatus(Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    FAILED = "failed"

class EnhancedTradeTracker:
    """향상된 거래 추적기 - 다중 암호화폐, 포지션 타입, 달러 기반 지원"""
    
    def __init__(self, data_file: str = "./enhanced_trade_positions.json"):
        self.data_file = data_file
        self.trades = self._load_trades()
        self.positions = {}  # 현재 열린 포지션들
        self._update_positions()
        
        print(f"📁 EnhancedTradeTracker 초기화: {self.data_file}")
        print(f"   기존 거래: {len(self.trades)}개")
        print(f"   열린 포지션: {len(self.positions)}개")
    
    def _load_trades(self) -> List[Dict]:
        """파일에서 거래 데이터 로드"""
        try:
            if not os.path.exists(self.data_file):
                print(f"📄 거래 파일이 없어 새로 생성: {self.data_file}")
                return []
                
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"📄 거래 파일 로드 완료: {len(data)}개 기존 거래")
                return data
        except FileNotFoundError:
            print(f"📄 거래 파일이 없어 새로 생성: {self.data_file}")
            return []
        except Exception as e:
            print(f"❌ 거래 로드 오류: {e}")
            return []
    
    def _save_trades(self):
        """거래 데이터를 파일에 저장"""
        try:
            # 디렉터리가 없으면 생성
            os.makedirs(os.path.dirname(self.data_file) if os.path.dirname(self.data_file) else ".", exist_ok=True)
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.trades, f, indent=2, ensure_ascii=False)
            
            print(f"💾 거래 저장 완료: {self.data_file} ({len(self.trades)}개 거래)")
        except Exception as e:
            print(f"❌ 거래 저장 오류: {e}")
    
    def _update_positions(self):
        """현재 포지션 상태 업데이트"""
        self.positions = {}
        
        for trade in self.trades:
            if trade.get("status") != "filled":
                continue
                
            symbol = trade["symbol"]
            position_type = trade.get("position_type", "spot")
            
            if symbol not in self.positions:
                self.positions[symbol] = {}
            
            if position_type not in self.positions[symbol]:
                self.positions[symbol][position_type] = {
                    "quantity": 0.0,
                    "total_invested": 0.0,
                    "average_price": 0.0,
                    "trades": [],
                    "unrealized_pnl": 0.0,
                    "status": "closed"
                }
            
            pos = self.positions[symbol][position_type]
            
            if trade["side"] in ["Buy", "buy"]:
                pos["quantity"] += trade["quantity"]
                pos["total_invested"] += trade["dollar_amount"]
                pos["status"] = "open" if pos["quantity"] > 0 else "closed"
            elif trade["side"] in ["Sell", "sell"]:
                pos["quantity"] -= trade["quantity"]
                pos["total_invested"] -= trade["dollar_amount"]
                pos["status"] = "closed" if pos["quantity"] <= 0 else "open"
            
            pos["trades"].append(trade)
            
            # 평균 가격 계산
            if pos["quantity"] > 0:
                pos["average_price"] = pos["total_invested"] / pos["quantity"]
            else:
                pos["average_price"] = 0.0
    
    def add_trade(self, 
                  symbol: str, 
                  side: str, 
                  quantity: float, 
                  price: float, 
                  signal: str = None,
                  position_type: str = "spot",
                  dollar_amount: float = None,
                  order_id: str = None,
                  status: str = "filled",
                  fees: float = 0.0,
                  failure_reason: str = None) -> Dict[str, Any]:
        """향상된 거래 기록 추가"""
        
        # 달러 금액 계산 (제공되지 않은 경우)
        if dollar_amount is None:
            dollar_amount = quantity * price
        
        trade = {
            "id": order_id or f"trade_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "side": side,  # Buy, Sell, Hold
            "quantity": quantity,
            "price": price,
            "dollar_amount": dollar_amount,
            "position_type": position_type,  # spot, long, short
            "signal": signal,  # buy, sell, hold, manual
            "status": status,  # pending, filled, cancelled, failed
            "fees": fees,
            "failure_reason": failure_reason
        }
        
        self.trades.append(trade)
        self._save_trades()
        self._update_positions()
        
        print(f"📝 거래 추가: {symbol} {side} {quantity} @ ${price:.4f} ({position_type})")
        
        return trade
    
    def get_positions_by_symbol(self, symbol: str) -> Dict[str, Any]:
        """특정 심볼의 모든 포지션 조회"""
        return self.positions.get(symbol, {})
    
    def get_all_open_positions(self) -> Dict[str, Dict[str, Any]]:
        """모든 열린 포지션 조회"""
        open_positions = {}
        
        for symbol, symbol_positions in self.positions.items():
            for position_type, position in symbol_positions.items():
                if position["status"] == "open" and position["quantity"] > 0:
                    if symbol not in open_positions:
                        open_positions[symbol] = {}
                    open_positions[symbol][position_type] = position
        
        return open_positions
    
    def get_portfolio_summary(self) -> Dict[str, Any]:
        """포트폴리오 요약 정보"""
        summary = {
            "total_trades": len(self.trades),
            "total_symbols": len(self.positions),
            "open_positions": 0,
            "total_invested": 0.0,
            "symbols": {}
        }
        
        for symbol, symbol_positions in self.positions.items():
            symbol_summary = {
                "total_quantity": 0.0,
                "total_invested": 0.0,
                "positions": {}
            }
            
            for position_type, position in symbol_positions.items():
                if position["status"] == "open":
                    summary["open_positions"] += 1
                    summary["total_invested"] += position["total_invested"]
                    symbol_summary["total_quantity"] += position["quantity"]
                    symbol_summary["total_invested"] += position["total_invested"]
                
                symbol_summary["positions"][position_type] = {
                    "quantity": position["quantity"],
                    "invested": position["total_invested"],
                    "average_price": position["average_price"],
                    "status": position["status"]
                }
            
            summary["symbols"][symbol] = symbol_summary
        
        return summary
    
    def calculate_pnl(self, symbol: str, current_price: float, position_type: str = "spot") -> Dict[str, Any]:
        """특정 포지션의 손익 계산"""
        if symbol not in self.positions or position_type not in self.positions[symbol]:
            return {
                "unrealized_pnl": 0.0,
                "unrealized_pnl_percent": 0.0,
                "realized_pnl": 0.0,
                "total_pnl": 0.0,
                "average_price": 0.0,
                "current_price": current_price,
                "quantity": 0.0,
                "invested_value": 0.0,
                "current_value": 0.0
            }
        
        position = self.positions[symbol][position_type]
        
        # 현재 가치 계산
        current_value = position["quantity"] * current_price
        invested_value = position["total_invested"]
        
        # 미실현 손익
        unrealized_pnl = current_value - invested_value
        unrealized_pnl_percent = (unrealized_pnl / invested_value * 100) if invested_value > 0 else 0.0
        
        # 실현 손익 계산 (매도된 거래들)
        realized_pnl = self._calculate_realized_pnl(symbol, position_type)
        
        # 총 손익
        total_pnl = unrealized_pnl + realized_pnl
        
        return {
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": unrealized_pnl_percent,
            "realized_pnl": realized_pnl,
            "total_pnl": total_pnl,
            "average_price": position["average_price"],
            "current_price": current_price,
            "quantity": position["quantity"],
            "invested_value": invested_value,
            "current_value": current_value
        }
    
    def _calculate_realized_pnl(self, symbol: str, position_type: str) -> float:
        """실현 손익 계산"""
        realized_pnl = 0.0
        
        # 해당 심볼과 포지션 타입의 매도 거래들 찾기
        for trade in self.trades:
            if (trade["symbol"] == symbol and 
                trade.get("position_type", "spot") == position_type and
                trade["side"] in ["Sell", "sell"] and
                trade.get("status") == "filled"):
                
                # 매도 시 실현된 손익 (간단한 계산)
                # 실제로는 FIFO/LIFO 등의 방법을 사용해야 함
                realized_pnl += trade["dollar_amount"]
        
        return realized_pnl
    
    def get_trade_history(self, 
                         symbol: str = None, 
                         position_type: str = None,
                         limit: int = 50,
                         include_signals: bool = True) -> List[Dict[str, Any]]:
        """거래 내역 조회"""
        filtered_trades = []
        
        for trade in self.trades:
            # 필터링
            if symbol and trade["symbol"] != symbol:
                continue
            if position_type and trade.get("position_type") != position_type:
                continue
            if not include_signals and trade.get("signal") == "hold":
                continue
            
            filtered_trades.append(trade)
        
        # 최신순 정렬 후 제한
        sorted_trades = sorted(filtered_trades, key=lambda x: x["timestamp"], reverse=True)
        return sorted_trades[:limit]
    
    def get_trading_signals(self, symbol: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """거래 신호 조회"""
        signals = []
        
        for trade in self.trades:
            if trade.get("signal") and trade["signal"] != "manual":
                if symbol is None or trade["symbol"] == symbol:
                    signals.append(trade)
        
        # 최신순 정렬 후 제한
        sorted_signals = sorted(signals, key=lambda x: x["timestamp"], reverse=True)
        return sorted_signals[:limit]
    
    def close_position(self, symbol: str, position_type: str = "spot", close_price: float = None) -> bool:
        """포지션 강제 종료"""
        try:
            if symbol not in self.positions or position_type not in self.positions[symbol]:
                print(f"❌ 종료할 포지션이 없습니다: {symbol} {position_type}")
                return False
            
            position = self.positions[symbol][position_type]
            if position["status"] != "open" or position["quantity"] <= 0:
                print(f"❌ 열린 포지션이 없습니다: {symbol} {position_type}")
                return False
            
            # 포지션 종료 거래 기록
            if close_price:
                self.add_trade(
                    symbol=symbol,
                    side="Sell",
                    quantity=position["quantity"],
                    price=close_price,
                    position_type=position_type,
                    signal="manual_close",
                    status="filled"
                )
            
            print(f"✅ 포지션 종료: {symbol} {position_type}")
            return True
            
        except Exception as e:
            print(f"❌ 포지션 종료 오류: {e}")
            return False
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """성과 지표 계산"""
        try:
            total_trades = len([t for t in self.trades if t.get("status") == "filled" and t["side"] != "Hold"])
            winning_trades = 0
            total_pnl = 0.0
            total_fees = sum([t.get("fees", 0.0) for t in self.trades])
            
            # 간단한 성과 계산 (실제로는 더 복잡한 계산 필요)
            for symbol, symbol_positions in self.positions.items():
                for position_type, position in symbol_positions.items():
                    if position["total_invested"] > 0:
                        # 현재 가격이 필요하지만 여기서는 평균 가격 사용
                        estimated_pnl = position["total_invested"] * 0.05  # 5% 가정
                        total_pnl += estimated_pnl
                        if estimated_pnl > 0:
                            winning_trades += 1
            
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0
            
            return {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "win_rate": win_rate,
                "total_pnl": total_pnl,
                "total_fees": total_fees,
                "net_pnl": total_pnl - total_fees
            }
            
        except Exception as e:
            print(f"❌ 성과 지표 계산 오류: {e}")
            return {}
    
    def export_trades_to_csv(self, filename: str = None) -> str:
        """거래 내역을 CSV로 내보내기"""
        try:
            import csv
            
            if filename is None:
                filename = f"trades_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['timestamp', 'symbol', 'side', 'quantity', 'price', 
                             'dollar_amount', 'position_type', 'signal', 'status', 'fees']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                for trade in self.trades:
                    writer.writerow({field: trade.get(field, '') for field in fieldnames})
            
            print(f"📊 거래 내역 CSV 내보내기 완료: {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ CSV 내보내기 오류: {e}")
            return ""