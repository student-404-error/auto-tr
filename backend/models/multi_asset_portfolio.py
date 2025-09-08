from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import json
import os
from .enhanced_trade import EnhancedTradeTracker, EnhancedTrade
from .position_manager import PositionManager, Position

@dataclass
class AssetData:
    """Data structure for individual asset in portfolio"""
    symbol: str
    total_quantity: float
    total_invested: float
    current_value: float
    average_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    percentage_of_portfolio: float
    positions: List[Dict[str, Any]]
    recent_trades: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)


@dataclass
class PortfolioSnapshot:
    """Portfolio snapshot for historical tracking"""
    timestamp: str
    total_portfolio_value: float
    total_invested: float
    total_unrealized_pnl: float
    total_unrealized_pnl_percent: float
    assets: Dict[str, Dict[str, Any]]
    supported_assets: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PortfolioSnapshot':
        """Create instance from dictionary"""
        return cls(**data)


class MultiAssetPortfolio:
    """Multi-asset portfolio manager supporting BTC, XRP, SOL and more"""
    
    # Supported cryptocurrencies
    SUPPORTED_ASSETS = ['BTCUSDT', 'XRPUSDT', 'SOLUSDT']
    
    def __init__(
        self, 
        history_file: str = "./multi_asset_portfolio_history.json",
        trade_tracker: Optional[EnhancedTradeTracker] = None,
        position_manager: Optional[PositionManager] = None
    ):
        self.history_file = history_file
        self.trade_tracker = trade_tracker or EnhancedTradeTracker()
        self.position_manager = position_manager or PositionManager()
        self.history: List[PortfolioSnapshot] = self._load_history()
        print(f"📁 MultiAssetPortfolio 초기화: {len(self.SUPPORTED_ASSETS)}개 자산 지원")
    
    def _load_history(self) -> List[PortfolioSnapshot]:
        """Load portfolio history from file"""
        try:
            if not os.path.exists(self.history_file):
                print(f"📄 포트폴리오 히스토리 파일이 없어 새로 생성: {self.history_file}")
                return []
                
            with open(self.history_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                history = [PortfolioSnapshot.from_dict(snapshot_data) for snapshot_data in data]
                print(f"📄 포트폴리오 히스토리 로드 완료: {len(history)}개 스냅샷")
                return history
        except FileNotFoundError:
            print(f"📄 포트폴리오 히스토리 파일이 없어 새로 생성: {self.history_file}")
            return []
        except Exception as e:
            print(f"❌ 포트폴리오 히스토리 로드 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _save_history(self):
        """Save portfolio history to file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.history_file) if os.path.dirname(self.history_file) else '.', exist_ok=True)
            
            with open(self.history_file, 'w', encoding='utf-8') as f:
                history_dicts = [snapshot.to_dict() for snapshot in self.history]
                json.dump(history_dicts, f, indent=2, ensure_ascii=False)
            
            print(f"💾 포트폴리오 히스토리 저장 완료: {self.history_file} ({len(self.history)}개 스냅샷)")
        except Exception as e:
            print(f"❌ 포트폴리오 히스토리 저장 오류: {e}")
            import traceback
            traceback.print_exc()
    
    def calculate_asset_data(self, symbol: str, current_price: float) -> AssetData:
        """Calculate comprehensive data for a single asset"""
        # Get P&L data from trade tracker
        pnl_data = self.trade_tracker.calculate_asset_pnl(symbol, current_price)
        
        # Get positions for this asset
        open_positions = self.position_manager.get_open_positions(symbol)
        
        # Get recent trades for this asset
        recent_trades = [
            trade.to_dict() for trade in 
            self.trade_tracker.get_trades_by_symbol(symbol)[-5:]  # Last 5 trades
        ]
        
        return AssetData(
            symbol=symbol,
            total_quantity=pnl_data['total_quantity'],
            total_invested=pnl_data['total_invested'],
            current_value=pnl_data['current_value'],
            average_price=pnl_data['average_price'],
            current_price=current_price,
            unrealized_pnl=pnl_data['unrealized_pnl'],
            unrealized_pnl_percent=pnl_data['unrealized_pnl_percent'],
            percentage_of_portfolio=0.0,  # Will be calculated in get_portfolio_data
            positions=[pos.to_dict() for pos in open_positions],
            recent_trades=recent_trades
        )
    
    def get_portfolio_data(self, current_prices: Dict[str, float]) -> Dict[str, Any]:
        """Get comprehensive portfolio data for all supported assets"""
        assets_data = {}
        total_portfolio_value = 0.0
        total_invested = 0.0
        total_unrealized_pnl = 0.0
        
        # Calculate data for each supported asset
        for symbol in self.SUPPORTED_ASSETS:
            current_price = current_prices.get(symbol, 0.0)
            if current_price > 0:
                asset_data = self.calculate_asset_data(symbol, current_price)
                assets_data[symbol] = asset_data
                
                total_portfolio_value += asset_data.current_value
                total_invested += asset_data.total_invested
                total_unrealized_pnl += asset_data.unrealized_pnl
        
        # Calculate portfolio percentages
        for symbol, asset_data in assets_data.items():
            if total_portfolio_value > 0:
                asset_data.percentage_of_portfolio = (asset_data.current_value / total_portfolio_value) * 100
        
        # Calculate total P&L percentage
        total_unrealized_pnl_percent = (total_unrealized_pnl / total_invested * 100) if total_invested > 0 else 0
        
        # Get position summary
        position_summary = self.position_manager.get_positions_summary()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_portfolio_value": total_portfolio_value,
            "total_invested": total_invested,
            "total_unrealized_pnl": total_unrealized_pnl,
            "total_unrealized_pnl_percent": total_unrealized_pnl_percent,
            "supported_assets": self.SUPPORTED_ASSETS,
            "assets": {symbol: asset_data.to_dict() for symbol, asset_data in assets_data.items()},
            "position_summary": position_summary,
            "asset_count": len([asset for asset in assets_data.values() if asset.total_quantity > 0])
        }
    
    def add_portfolio_snapshot(self, current_prices: Dict[str, float]):
        """Add a portfolio snapshot to history"""
        portfolio_data = self.get_portfolio_data(current_prices)
        
        # Only add snapshot if there's actual portfolio value
        if portfolio_data["total_portfolio_value"] > 0:
            snapshot = PortfolioSnapshot(
                timestamp=portfolio_data["timestamp"],
                total_portfolio_value=portfolio_data["total_portfolio_value"],
                total_invested=portfolio_data["total_invested"],
                total_unrealized_pnl=portfolio_data["total_unrealized_pnl"],
                total_unrealized_pnl_percent=portfolio_data["total_unrealized_pnl_percent"],
                assets=portfolio_data["assets"],
                supported_assets=self.SUPPORTED_ASSETS
            )
            
            self.history.append(snapshot)
            
            # Keep only last 30 days of history
            cutoff_date = datetime.now() - timedelta(days=30)
            self.history = [
                h for h in self.history 
                if datetime.fromisoformat(h.timestamp) > cutoff_date
            ]
            
            self._save_history()
            print(f"📊 포트폴리오 스냅샷 추가: 총 가치 ${portfolio_data['total_portfolio_value']:.2f}")
    
    def get_portfolio_history(self, period: str = "7d") -> List[Dict[str, Any]]:
        """Get portfolio history for specified period"""
        if period == "1d":
            cutoff = datetime.now() - timedelta(days=1)
        elif period == "7d":
            cutoff = datetime.now() - timedelta(days=7)
        elif period == "30d":
            cutoff = datetime.now() - timedelta(days=30)
        else:
            cutoff = datetime.now() - timedelta(days=7)
        
        filtered_history = [
            h.to_dict() for h in self.history 
            if datetime.fromisoformat(h.timestamp) > cutoff
        ]
        
        return filtered_history
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Calculate portfolio performance statistics"""
        if len(self.history) < 2:
            return {
                "daily_change": 0,
                "weekly_change": 0,
                "monthly_change": 0,
                "daily_change_percent": 0,
                "weekly_change_percent": 0,
                "monthly_change_percent": 0,
                "best_performing_asset": None,
                "worst_performing_asset": None
            }
        
        current = self.history[-1].total_portfolio_value
        
        # Daily change
        day_ago = datetime.now() - timedelta(days=1)
        daily_data = [h for h in self.history if datetime.fromisoformat(h.timestamp) > day_ago]
        daily_start = daily_data[0].total_portfolio_value if daily_data else current
        
        # Weekly change
        week_ago = datetime.now() - timedelta(days=7)
        weekly_data = [h for h in self.history if datetime.fromisoformat(h.timestamp) > week_ago]
        weekly_start = weekly_data[0].total_portfolio_value if weekly_data else current
        
        # Monthly change
        month_ago = datetime.now() - timedelta(days=30)
        monthly_data = [h for h in self.history if datetime.fromisoformat(h.timestamp) > month_ago]
        monthly_start = monthly_data[0].total_portfolio_value if monthly_data else current
        
        # Find best and worst performing assets from latest snapshot
        best_asset = None
        worst_asset = None
        if self.history:
            latest_assets = self.history[-1].assets
            if latest_assets:
                sorted_assets = sorted(
                    latest_assets.items(), 
                    key=lambda x: x[1].get('unrealized_pnl_percent', 0), 
                    reverse=True
                )
                if sorted_assets:
                    best_asset = sorted_assets[0][0]
                    worst_asset = sorted_assets[-1][0]
        
        return {
            "daily_change": current - daily_start,
            "weekly_change": current - weekly_start,
            "monthly_change": current - monthly_start,
            "daily_change_percent": ((current - daily_start) / daily_start * 100) if daily_start > 0 else 0,
            "weekly_change_percent": ((current - weekly_start) / weekly_start * 100) if weekly_start > 0 else 0,
            "monthly_change_percent": ((current - monthly_start) / monthly_start * 100) if monthly_start > 0 else 0,
            "best_performing_asset": best_asset,
            "worst_performing_asset": worst_asset
        }
    
    def get_asset_allocation(self) -> Dict[str, float]:
        """Get current asset allocation percentages"""
        if not self.history:
            return {}
        
        latest_snapshot = self.history[-1]
        allocation = {}
        
        for symbol, asset_data in latest_snapshot.assets.items():
            if asset_data.get('current_value', 0) > 0:
                allocation[symbol] = asset_data.get('percentage_of_portfolio', 0)
        
        return allocation