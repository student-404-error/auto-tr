from datetime import datetime
from typing import Dict, List, Any, Optional, Literal
from dataclasses import dataclass, asdict
import json
import os
import uuid

# Type definitions for better type safety
PositionType = Literal['long', 'short', 'spot']
OrderSide = Literal['buy', 'sell']
OrderStatus = Literal['pending', 'filled', 'cancelled', 'failed']

@dataclass
class EnhancedTrade:
    """Enhanced trade model with position types and dollar amounts"""
    id: str
    timestamp: str
    symbol: str
    side: OrderSide
    position_type: PositionType
    quantity: float
    price: float
    dollar_amount: float
    signal: Optional[str] = None
    fees: float = 0.0
    status: OrderStatus = 'filled'
    failure_reason: Optional[str] = None
    
    @classmethod
    def create(
        cls,
        symbol: str,
        side: OrderSide,
        position_type: PositionType,
        quantity: float,
        price: float,
        dollar_amount: float,
        signal: Optional[str] = None,
        fees: float = 0.0,
        status: OrderStatus = 'filled',
        failure_reason: Optional[str] = None
    ) -> 'EnhancedTrade':
        """Create a new enhanced trade instance"""
        return cls(
            id=str(uuid.uuid4()),
            timestamp=datetime.now().isoformat(),
            symbol=symbol,
            side=side,
            position_type=position_type,
            quantity=quantity,
            price=price,
            dollar_amount=dollar_amount,
            signal=signal,
            fees=fees,
            status=status,
            failure_reason=failure_reason
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EnhancedTrade':
        """Create instance from dictionary"""
        return cls(**data)


class EnhancedTradeTracker:
    """Enhanced trade tracker supporting multiple assets and position types"""
    
    def __init__(self, data_file: str = "./enhanced_trades.json"):
        self.data_file = data_file
        self.trades: List[EnhancedTrade] = self._load_trades()
        print(f"📁 EnhancedTradeTracker 초기화: {self.data_file} (기존 거래: {len(self.trades)}개)")
    
    def _load_trades(self) -> List[EnhancedTrade]:
        """Load trades from file"""
        try:
            if not os.path.exists(self.data_file):
                print(f"📄 거래 파일이 없어 새로 생성: {self.data_file}")
                return []
                
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                trades = [EnhancedTrade.from_dict(trade_data) for trade_data in data]
                print(f"📄 거래 파일 로드 완료: {len(trades)}개 기존 거래")
                return trades
        except FileNotFoundError:
            print(f"📄 거래 파일이 없어 새로 생성: {self.data_file}")
            return []
        except Exception as e:
            print(f"❌ 거래 로드 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _save_trades(self):
        """Save trades to file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.data_file) if os.path.dirname(self.data_file) else '.', exist_ok=True)
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                trade_dicts = [trade.to_dict() for trade in self.trades]
                json.dump(trade_dicts, f, indent=2, ensure_ascii=False)
            
            print(f"💾 거래 저장 완료: {self.data_file} ({len(self.trades)}개 거래)")
        except Exception as e:
            print(f"❌ 거래 저장 오류: {e}")
            import traceback
            traceback.print_exc()
    
    def add_trade(
        self,
        symbol: str,
        side: OrderSide,
        position_type: PositionType,
        quantity: float,
        price: float,
        dollar_amount: float = None,
        signal: Optional[str] = None,
        fees: float = 0.0,
        status: OrderStatus = 'filled',
        failure_reason: Optional[str] = None
    ) -> EnhancedTrade:
        """Add a new trade record"""
        
        # Calculate dollar amount if not provided
        if dollar_amount is None:
            dollar_amount = quantity * price
        
        trade = EnhancedTrade.create(
            symbol=symbol,
            side=side,
            position_type=position_type,
            quantity=quantity,
            price=price,
            dollar_amount=dollar_amount,
            signal=signal,
            fees=fees,
            status=status,
            failure_reason=failure_reason
        )
        
        self.trades.append(trade)
        self._save_trades()
        
        print(f"📝 거래 추가됨: {symbol} {side} {position_type} - 총 {len(self.trades)}개 거래 저장됨")
        
        return trade
    
    def get_trades_by_symbol(self, symbol: str) -> List[EnhancedTrade]:
        """Get all trades for a specific symbol"""
        return [trade for trade in self.trades if trade.symbol == symbol]
    
    def get_trades_by_position_type(self, position_type: PositionType) -> List[EnhancedTrade]:
        """Get all trades for a specific position type"""
        return [trade for trade in self.trades if trade.position_type == position_type]
    
    def get_recent_trades(self, limit: int = 10) -> List[EnhancedTrade]:
        """Get recent trades"""
        return sorted(self.trades, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_trades_with_signals(self, limit: int = 5) -> List[EnhancedTrade]:
        """Get recent trades that have signals (not manual trades)"""
        signal_trades = [
            trade for trade in self.trades 
            if trade.signal and trade.signal != "manual"
        ]
        
        return sorted(signal_trades, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def calculate_asset_pnl(self, symbol: str, current_price: float) -> Dict[str, Any]:
        """Calculate P&L for a specific asset"""
        symbol_trades = self.get_trades_by_symbol(symbol)
        
        if not symbol_trades:
            return {
                "symbol": symbol,
                "total_quantity": 0,
                "average_price": 0,
                "total_invested": 0,
                "current_value": 0,
                "unrealized_pnl": 0,
                "unrealized_pnl_percent": 0,
                "current_price": current_price
            }
        
        total_quantity = 0
        total_invested = 0
        
        for trade in symbol_trades:
            if trade.side == "buy":
                total_quantity += trade.quantity
                total_invested += trade.dollar_amount
            else:  # sell
                total_quantity -= trade.quantity
                total_invested -= trade.dollar_amount
        
        if total_quantity <= 0:
            return {
                "symbol": symbol,
                "total_quantity": 0,
                "average_price": 0,
                "total_invested": 0,
                "current_value": 0,
                "unrealized_pnl": 0,
                "unrealized_pnl_percent": 0,
                "current_price": current_price
            }
        
        average_price = total_invested / total_quantity if total_quantity > 0 else 0
        current_value = total_quantity * current_price
        unrealized_pnl = current_value - total_invested
        unrealized_pnl_percent = (unrealized_pnl / total_invested * 100) if total_invested > 0 else 0
        
        return {
            "symbol": symbol,
            "total_quantity": total_quantity,
            "average_price": average_price,
            "total_invested": total_invested,
            "current_value": current_value,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": unrealized_pnl_percent,
            "current_price": current_price
        }