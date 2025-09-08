from datetime import datetime
from typing import Dict, List, Any, Optional, Literal
from dataclasses import dataclass, asdict
import json
import os
import uuid

# Type definitions
PositionStatus = Literal['open', 'closed']
PositionType = Literal['long', 'short']

@dataclass
class Position:
    """Position model for tracking long/short positions"""
    id: str
    symbol: str
    position_type: PositionType
    entry_price: float
    quantity: float
    dollar_amount: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    open_time: str
    close_time: Optional[str] = None
    status: PositionStatus = 'open'
    entry_trade_id: Optional[str] = None
    exit_trade_id: Optional[str] = None
    
    @classmethod
    def create(
        cls,
        symbol: str,
        position_type: PositionType,
        entry_price: float,
        quantity: float,
        dollar_amount: float,
        current_price: float,
        entry_trade_id: Optional[str] = None
    ) -> 'Position':
        """Create a new position"""
        unrealized_pnl = cls._calculate_pnl(position_type, entry_price, current_price, quantity)
        unrealized_pnl_percent = (unrealized_pnl / dollar_amount * 100) if dollar_amount > 0 else 0
        
        return cls(
            id=str(uuid.uuid4()),
            symbol=symbol,
            position_type=position_type,
            entry_price=entry_price,
            quantity=quantity,
            dollar_amount=dollar_amount,
            current_price=current_price,
            unrealized_pnl=unrealized_pnl,
            unrealized_pnl_percent=unrealized_pnl_percent,
            open_time=datetime.now().isoformat(),
            entry_trade_id=entry_trade_id
        )
    
    @staticmethod
    def _calculate_pnl(position_type: PositionType, entry_price: float, current_price: float, quantity: float) -> float:
        """Calculate P&L based on position type"""
        if position_type == 'long':
            return (current_price - entry_price) * quantity
        else:  # short
            return (entry_price - current_price) * quantity
    
    def update_current_price(self, current_price: float):
        """Update current price and recalculate P&L"""
        self.current_price = current_price
        self.unrealized_pnl = self._calculate_pnl(self.position_type, self.entry_price, current_price, self.quantity)
        self.unrealized_pnl_percent = (self.unrealized_pnl / self.dollar_amount * 100) if self.dollar_amount > 0 else 0
    
    def close_position(self, exit_trade_id: Optional[str] = None):
        """Close the position"""
        self.status = 'closed'
        self.close_time = datetime.now().isoformat()
        self.exit_trade_id = exit_trade_id
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Position':
        """Create instance from dictionary"""
        return cls(**data)


class PositionManager:
    """Manager for tracking and managing trading positions"""
    
    def __init__(self, data_file: str = "./positions.json"):
        self.data_file = data_file
        self.positions: List[Position] = self._load_positions()
        print(f"📁 PositionManager 초기화: {self.data_file} (기존 포지션: {len(self.positions)}개)")
    
    def _load_positions(self) -> List[Position]:
        """Load positions from file"""
        try:
            if not os.path.exists(self.data_file):
                print(f"📄 포지션 파일이 없어 새로 생성: {self.data_file}")
                return []
                
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                positions = [Position.from_dict(pos_data) for pos_data in data]
                print(f"📄 포지션 파일 로드 완료: {len(positions)}개 기존 포지션")
                return positions
        except FileNotFoundError:
            print(f"📄 포지션 파일이 없어 새로 생성: {self.data_file}")
            return []
        except Exception as e:
            print(f"❌ 포지션 로드 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _save_positions(self):
        """Save positions to file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.data_file) if os.path.dirname(self.data_file) else '.', exist_ok=True)
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                position_dicts = [position.to_dict() for position in self.positions]
                json.dump(position_dicts, f, indent=2, ensure_ascii=False)
            
            print(f"💾 포지션 저장 완료: {self.data_file} ({len(self.positions)}개 포지션)")
        except Exception as e:
            print(f"❌ 포지션 저장 오류: {e}")
            import traceback
            traceback.print_exc()
    
    def open_position(
        self,
        symbol: str,
        position_type: PositionType,
        entry_price: float,
        quantity: float,
        dollar_amount: float,
        current_price: float,
        entry_trade_id: Optional[str] = None
    ) -> Position:
        """Open a new position"""
        position = Position.create(
            symbol=symbol,
            position_type=position_type,
            entry_price=entry_price,
            quantity=quantity,
            dollar_amount=dollar_amount,
            current_price=current_price,
            entry_trade_id=entry_trade_id
        )
        
        self.positions.append(position)
        self._save_positions()
        
        print(f"📈 포지션 오픈: {symbol} {position_type} - ID: {position.id}")
        
        return position
    
    def close_position(self, position_id: str, exit_trade_id: Optional[str] = None) -> Optional[Position]:
        """Close a position by ID"""
        for position in self.positions:
            if position.id == position_id and position.status == 'open':
                position.close_position(exit_trade_id)
                self._save_positions()
                print(f"📉 포지션 클로즈: {position.symbol} {position.position_type} - ID: {position_id}")
                return position
        
        print(f"⚠️ 포지션을 찾을 수 없음: {position_id}")
        return None
    
    def get_open_positions(self, symbol: Optional[str] = None) -> List[Position]:
        """Get all open positions, optionally filtered by symbol"""
        open_positions = [pos for pos in self.positions if pos.status == 'open']
        
        if symbol:
            open_positions = [pos for pos in open_positions if pos.symbol == symbol]
        
        return open_positions
    
    def get_closed_positions(self, symbol: Optional[str] = None) -> List[Position]:
        """Get all closed positions, optionally filtered by symbol"""
        closed_positions = [pos for pos in self.positions if pos.status == 'closed']
        
        if symbol:
            closed_positions = [pos for pos in closed_positions if pos.symbol == symbol]
        
        return closed_positions
    
    def get_position_by_id(self, position_id: str) -> Optional[Position]:
        """Get a position by ID"""
        for position in self.positions:
            if position.id == position_id:
                return position
        return None
    
    def update_positions_price(self, symbol: str, current_price: float):
        """Update current price for all open positions of a symbol"""
        updated_count = 0
        for position in self.positions:
            if position.symbol == symbol and position.status == 'open':
                position.update_current_price(current_price)
                updated_count += 1
        
        if updated_count > 0:
            self._save_positions()
            print(f"💰 가격 업데이트: {symbol} - {updated_count}개 포지션")
    
    def get_positions_summary(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Get summary of positions"""
        open_positions = self.get_open_positions(symbol)
        closed_positions = self.get_closed_positions(symbol)
        
        total_unrealized_pnl = sum(pos.unrealized_pnl for pos in open_positions)
        total_invested = sum(pos.dollar_amount for pos in open_positions)
        
        # Calculate realized P&L from closed positions
        realized_pnl = 0
        for pos in closed_positions:
            if pos.position_type == 'long':
                realized_pnl += (pos.current_price - pos.entry_price) * pos.quantity
            else:  # short
                realized_pnl += (pos.entry_price - pos.current_price) * pos.quantity
        
        return {
            "open_positions_count": len(open_positions),
            "closed_positions_count": len(closed_positions),
            "total_unrealized_pnl": total_unrealized_pnl,
            "total_invested": total_invested,
            "realized_pnl": realized_pnl,
            "open_positions": [pos.to_dict() for pos in open_positions],
            "symbol_filter": symbol
        }