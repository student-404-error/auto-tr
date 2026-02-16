from typing import Dict, List, Any, Optional, Literal
from datetime import datetime
import asyncio
from models.position_manager import PositionManager, Position, PositionType, PositionStatus
from models.enhanced_trade import EnhancedTradeTracker, EnhancedTrade
import logging

logger = logging.getLogger(__name__)

class PositionService:
    """Position tracking backend service with P&L calculation and management"""
    
    def __init__(self, position_manager: PositionManager, trade_tracker: EnhancedTradeTracker):
        self.position_manager = position_manager
        self.trade_tracker = trade_tracker
        self.current_prices: Dict[str, float] = {}
        
        logger.info("PositionService initialized")
    
    async def open_position(
        self,
        symbol: str,
        position_type: PositionType,
        entry_price: float,
        quantity: float,
        dollar_amount: float,
        trading_client=None
    ) -> Dict[str, Any]:
        """
        Open a new position and record the entry trade
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            position_type: 'long' or 'short'
            entry_price: Entry price for the position
            quantity: Quantity of the asset
            dollar_amount: Dollar amount invested
            trading_client: Optional trading client for real orders
            
        Returns:
            Dict containing position data and trade record
        """
        try:
            # Record the entry trade
            entry_trade = self.trade_tracker.add_trade(
                symbol=symbol,
                side='buy' if position_type == 'long' else 'sell',
                position_type=position_type,
                quantity=quantity,
                price=entry_price,
                dollar_amount=dollar_amount,
                signal='position_open',
                status='filled'
            )
            
            # Create the position
            position = self.position_manager.open_position(
                symbol=symbol,
                position_type=position_type,
                entry_price=entry_price,
                quantity=quantity,
                dollar_amount=dollar_amount,
                current_price=entry_price,
                entry_trade_id=entry_trade.id
            )
            
            logger.info(f"Position opened: {symbol} {position_type} - ID: {position.id}")
            
            return {
                "success": True,
                "position": position.to_dict(),
                "entry_trade": entry_trade.to_dict(),
                "message": f"Position opened: {symbol} {position_type}"
            }
            
        except Exception as e:
            logger.error(f"Failed to open position: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to open position"
            }
    
    async def close_position(
        self,
        position_id: str,
        close_price: Optional[float] = None,
        trading_client=None
    ) -> Dict[str, Any]:
        """
        Close an existing position and record the exit trade
        
        Args:
            position_id: ID of the position to close
            close_price: Price at which to close (if None, uses current market price)
            trading_client: Optional trading client for real orders
            
        Returns:
            Dict containing closed position data and exit trade record
        """
        try:
            # Get the position
            position = self.position_manager.get_position_by_id(position_id)
            if not position:
                return {
                    "success": False,
                    "error": "Position not found",
                    "message": f"Position {position_id} not found"
                }
            
            if position.status != 'open':
                return {
                    "success": False,
                    "error": "Position already closed",
                    "message": f"Position {position_id} is already closed"
                }
            
            # Use current price if close_price not provided
            if close_price is None:
                close_price = self.current_prices.get(position.symbol, position.current_price)
            
            # Update position with current price before closing
            position.update_current_price(close_price)
            
            # Calculate final P&L
            final_pnl = position.unrealized_pnl
            final_pnl_percent = position.unrealized_pnl_percent
            
            # Record the exit trade
            exit_trade = self.trade_tracker.add_trade(
                symbol=position.symbol,
                side='sell' if position.position_type == 'long' else 'buy',
                position_type=position.position_type,
                quantity=position.quantity,
                price=close_price,
                dollar_amount=position.quantity * close_price,
                signal='position_close',
                status='filled'
            )
            
            # Close the position
            closed_position = self.position_manager.close_position(position_id, exit_trade.id)
            
            logger.info(f"Position closed: {position.symbol} {position.position_type} - P&L: ${final_pnl:.2f}")
            
            return {
                "success": True,
                "position": closed_position.to_dict() if closed_position else None,
                "exit_trade": exit_trade.to_dict(),
                "final_pnl": final_pnl,
                "final_pnl_percent": final_pnl_percent,
                "message": f"Position closed with P&L: ${final_pnl:.2f} ({final_pnl_percent:.2f}%)"
            }
            
        except Exception as e:
            logger.error(f"Failed to close position: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to close position"
            }
    
    async def update_position_prices(self, price_updates: Dict[str, float]):
        """
        Update current prices for all positions
        
        Args:
            price_updates: Dict mapping symbol to current price
        """
        try:
            self.current_prices.update(price_updates)
            
            for symbol, price in price_updates.items():
                self.position_manager.update_positions_price(symbol, price)
            
            logger.debug(f"Updated prices for {len(price_updates)} symbols")
            
        except Exception as e:
            logger.error(f"Failed to update position prices: {e}")
    
    def get_open_positions(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all open positions with current P&L
        
        Args:
            symbol: Optional symbol filter
            
        Returns:
            List of position dictionaries with current P&L
        """
        try:
            open_positions = self.position_manager.get_open_positions(symbol)
            
            # Enhance with current P&L calculations
            enhanced_positions = []
            for position in open_positions:
                position_dict = position.to_dict()
                
                # Add additional calculated fields
                position_dict.update({
                    "current_value": position.quantity * position.current_price,
                    "invested_value": position.dollar_amount,
                    "pnl_color": "green" if position.unrealized_pnl >= 0 else "red",
                    "days_open": self._calculate_days_open(position.open_time),
                    "entry_date": position.open_time[:10],  # YYYY-MM-DD format
                })
                
                enhanced_positions.append(position_dict)
            
            return enhanced_positions
            
        except Exception as e:
            logger.error(f"Failed to get open positions: {e}")
            return []
    
    def get_closed_positions(self, symbol: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get closed positions with realized P&L
        
        Args:
            symbol: Optional symbol filter
            limit: Maximum number of positions to return
            
        Returns:
            List of closed position dictionaries
        """
        try:
            closed_positions = self.position_manager.get_closed_positions(symbol)
            
            # Sort by close time (most recent first) and limit
            closed_positions.sort(key=lambda x: x.close_time or "", reverse=True)
            closed_positions = closed_positions[:limit]
            
            # Enhance with additional data
            enhanced_positions = []
            for position in closed_positions:
                position_dict = position.to_dict()
                
                # Calculate realized P&L (final P&L when closed)
                realized_pnl = position.unrealized_pnl  # This is the final P&L when position was closed
                
                position_dict.update({
                    "realized_pnl": realized_pnl,
                    "realized_pnl_percent": position.unrealized_pnl_percent,
                    "pnl_color": "green" if realized_pnl >= 0 else "red",
                    "days_held": self._calculate_days_held(position.open_time, position.close_time),
                    "entry_date": position.open_time[:10],
                    "exit_date": position.close_time[:10] if position.close_time else None,
                })
                
                enhanced_positions.append(position_dict)
            
            return enhanced_positions
            
        except Exception as e:
            logger.error(f"Failed to get closed positions: {e}")
            return []
    
    def get_position_summary(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """
        Get comprehensive position summary with statistics
        
        Args:
            symbol: Optional symbol filter
            
        Returns:
            Dict containing position summary and statistics
        """
        try:
            # Get basic summary from position manager
            summary = self.position_manager.get_positions_summary(symbol)
            
            # Get open and closed positions for additional calculations
            open_positions = self.get_open_positions(symbol)
            closed_positions = self.get_closed_positions(symbol)
            
            # Calculate additional statistics
            total_positions = len(open_positions) + len(closed_positions)
            winning_positions = len([p for p in closed_positions if p.get("realized_pnl", 0) > 0])
            losing_positions = len([p for p in closed_positions if p.get("realized_pnl", 0) < 0])
            
            win_rate = (winning_positions / len(closed_positions) * 100) if closed_positions else 0
            
            # Calculate average holding period
            avg_holding_days = 0
            if closed_positions:
                total_days = sum([p.get("days_held", 0) for p in closed_positions])
                avg_holding_days = total_days / len(closed_positions)
            
            # Enhance summary with additional statistics
            summary.update({
                "statistics": {
                    "total_positions": total_positions,
                    "winning_positions": winning_positions,
                    "losing_positions": losing_positions,
                    "win_rate": round(win_rate, 2),
                    "avg_holding_days": round(avg_holding_days, 1),
                    "total_realized_pnl": sum([p.get("realized_pnl", 0) for p in closed_positions]),
                    "best_trade": max([p.get("realized_pnl", 0) for p in closed_positions]) if closed_positions else 0,
                    "worst_trade": min([p.get("realized_pnl", 0) for p in closed_positions]) if closed_positions else 0,
                },
                "open_positions": open_positions,
                "recent_closed_positions": closed_positions[:10]  # Last 10 closed positions
            })
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get position summary: {e}")
            return {
                "open_positions_count": 0,
                "closed_positions_count": 0,
                "total_unrealized_pnl": 0,
                "total_invested": 0,
                "realized_pnl": 0,
                "statistics": {},
                "open_positions": [],
                "recent_closed_positions": []
            }
    
    def get_position_by_id(self, position_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for a specific position
        
        Args:
            position_id: Position ID
            
        Returns:
            Position dictionary with detailed information or None
        """
        try:
            position = self.position_manager.get_position_by_id(position_id)
            if not position:
                return None
            
            position_dict = position.to_dict()
            
            # Add related trades
            entry_trade = None
            exit_trade = None
            
            if position.entry_trade_id:
                for trade in self.trade_tracker.trades:
                    if trade.id == position.entry_trade_id:
                        entry_trade = trade.to_dict()
                        break
            
            if position.exit_trade_id:
                for trade in self.trade_tracker.trades:
                    if trade.id == position.exit_trade_id:
                        exit_trade = trade.to_dict()
                        break
            
            position_dict.update({
                "entry_trade": entry_trade,
                "exit_trade": exit_trade,
                "current_value": position.quantity * position.current_price,
                "invested_value": position.dollar_amount,
                "pnl_color": "green" if position.unrealized_pnl >= 0 else "red",
                "days_open_or_held": (
                    self._calculate_days_open(position.open_time) if position.status == 'open'
                    else self._calculate_days_held(position.open_time, position.close_time)
                )
            })
            
            return position_dict
            
        except Exception as e:
            logger.error(f"Failed to get position by ID: {e}")
            return None
    
    def _calculate_days_open(self, open_time: str) -> int:
        """Calculate days since position was opened"""
        try:
            open_dt = datetime.fromisoformat(open_time.replace('Z', '+00:00'))
            now = datetime.now(open_dt.tzinfo) if open_dt.tzinfo else datetime.now()
            return (now - open_dt).days
        except:
            return 0
    
    def _calculate_days_held(self, open_time: str, close_time: Optional[str]) -> int:
        """Calculate days position was held"""
        try:
            if not close_time:
                return 0
            
            open_dt = datetime.fromisoformat(open_time.replace('Z', '+00:00'))
            close_dt = datetime.fromisoformat(close_time.replace('Z', '+00:00'))
            return (close_dt - open_dt).days
        except:
            return 0
    
    async def auto_close_positions_by_criteria(
        self,
        symbol: Optional[str] = None,
        max_loss_percent: Optional[float] = None,
        min_profit_percent: Optional[float] = None,
        max_days_open: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Automatically close positions based on specified criteria
        
        Args:
            symbol: Optional symbol filter
            max_loss_percent: Close positions with loss >= this percentage
            min_profit_percent: Close positions with profit >= this percentage  
            max_days_open: Close positions open for >= this many days
            
        Returns:
            List of closed position results
        """
        try:
            open_positions = self.position_manager.get_open_positions(symbol)
            closed_results = []
            
            for position in open_positions:
                should_close = False
                close_reason = ""
                
                # Check loss threshold
                if max_loss_percent and position.unrealized_pnl_percent <= -abs(max_loss_percent):
                    should_close = True
                    close_reason = f"Stop loss: {position.unrealized_pnl_percent:.2f}%"
                
                # Check profit threshold
                elif min_profit_percent and position.unrealized_pnl_percent >= min_profit_percent:
                    should_close = True
                    close_reason = f"Take profit: {position.unrealized_pnl_percent:.2f}%"
                
                # Check days open threshold
                elif max_days_open and self._calculate_days_open(position.open_time) >= max_days_open:
                    should_close = True
                    close_reason = f"Max days reached: {self._calculate_days_open(position.open_time)} days"
                
                if should_close:
                    result = await self.close_position(position.id)
                    result["close_reason"] = close_reason
                    closed_results.append(result)
                    
                    logger.info(f"Auto-closed position {position.id}: {close_reason}")
            
            return closed_results
            
        except Exception as e:
            logger.error(f"Failed to auto-close positions: {e}")
            return []