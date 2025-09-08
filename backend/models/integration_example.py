#!/usr/bin/env python3
"""
Integration example showing how enhanced models work together
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.enhanced_trade import EnhancedTradeTracker
from models.position_manager import PositionManager
from models.multi_asset_portfolio import MultiAssetPortfolio

def demonstrate_enhanced_models():
    """Demonstrate how the enhanced models integrate together"""
    
    print("🚀 Enhanced Trading Models Integration Demo")
    print("=" * 50)
    
    # Initialize the enhanced models
    trade_tracker = EnhancedTradeTracker("./demo_trades.json")
    position_manager = PositionManager("./demo_positions.json")
    portfolio = MultiAssetPortfolio(
        "./demo_portfolio.json",
        trade_tracker,
        position_manager
    )
    
    print("\n1. 📝 Adding Enhanced Trades with Position Types")
    print("-" * 45)
    
    # Add some trades with different position types
    trades = [
        {
            "symbol": "BTCUSDT",
            "side": "buy",
            "position_type": "long",
            "quantity": 0.001,
            "price": 50000.0,
            "dollar_amount": 50.0,
            "signal": "bullish_signal"
        },
        {
            "symbol": "XRPUSDT", 
            "side": "buy",
            "position_type": "spot",
            "quantity": 100.0,
            "price": 0.5,
            "dollar_amount": 50.0,
            "signal": "manual"
        },
        {
            "symbol": "SOLUSDT",
            "side": "buy", 
            "position_type": "long",
            "quantity": 0.5,
            "price": 100.0,
            "dollar_amount": 50.0,
            "signal": "momentum_signal"
        }
    ]
    
    for trade_data in trades:
        trade = trade_tracker.add_trade(**trade_data)
        print(f"  ✅ Added {trade.symbol} {trade.position_type} trade: ${trade.dollar_amount}")
    
    print("\n2. 📊 Opening Positions")
    print("-" * 25)
    
    # Open positions for long trades
    positions = [
        {
            "symbol": "BTCUSDT",
            "position_type": "long",
            "entry_price": 50000.0,
            "quantity": 0.001,
            "dollar_amount": 50.0,
            "current_price": 52000.0
        },
        {
            "symbol": "SOLUSDT",
            "position_type": "long", 
            "entry_price": 100.0,
            "quantity": 0.5,
            "dollar_amount": 50.0,
            "current_price": 105.0
        }
    ]
    
    for pos_data in positions:
        position = position_manager.open_position(**pos_data)
        print(f"  📈 Opened {position.symbol} {position.position_type} position: ${position.unrealized_pnl:.2f} P&L")
    
    print("\n3. 💰 Multi-Asset Portfolio Analysis")
    print("-" * 35)
    
    # Current market prices
    current_prices = {
        "BTCUSDT": 52000.0,
        "XRPUSDT": 0.55,
        "SOLUSDT": 105.0
    }
    
    # Get comprehensive portfolio data
    portfolio_data = portfolio.get_portfolio_data(current_prices)
    
    print(f"  📊 Total Portfolio Value: ${portfolio_data['total_portfolio_value']:.2f}")
    print(f"  💵 Total Invested: ${portfolio_data['total_invested']:.2f}")
    print(f"  📈 Total P&L: ${portfolio_data['total_unrealized_pnl']:.2f} ({portfolio_data['total_unrealized_pnl_percent']:.1f}%)")
    print(f"  🪙 Active Assets: {portfolio_data['asset_count']}")
    
    print("\n4. 🎯 Asset Breakdown")
    print("-" * 20)
    
    for symbol, asset_data in portfolio_data['assets'].items():
        if asset_data['current_value'] > 0:
            print(f"  {symbol}:")
            print(f"    💰 Value: ${asset_data['current_value']:.2f} ({asset_data['percentage_of_portfolio']:.1f}%)")
            print(f"    📊 P&L: ${asset_data['unrealized_pnl']:.2f} ({asset_data['unrealized_pnl_percent']:.1f}%)")
            print(f"    📍 Positions: {len(asset_data['positions'])}")
    
    print("\n5. 📈 Adding Portfolio Snapshot")
    print("-" * 30)
    
    # Add a portfolio snapshot for historical tracking
    portfolio.add_portfolio_snapshot(current_prices)
    
    # Show performance stats
    performance = portfolio.get_performance_stats()
    print(f"  📊 Performance tracking initialized")
    print(f"  🏆 Best performer: {performance.get('best_performing_asset', 'N/A')}")
    print(f"  📉 Worst performer: {performance.get('worst_performing_asset', 'N/A')}")
    
    print("\n6. 🔄 Position Management Demo")
    print("-" * 30)
    
    # Update prices and show impact
    updated_prices = {
        "BTCUSDT": 55000.0,  # +5.8% gain
        "XRPUSDT": 0.52,     # -5.5% loss  
        "SOLUSDT": 110.0     # +4.8% gain
    }
    
    print("  📊 Price updates:")
    for symbol, new_price in updated_prices.items():
        old_price = current_prices[symbol]
        change_pct = ((new_price - old_price) / old_price) * 100
        print(f"    {symbol}: ${old_price:.2f} → ${new_price:.2f} ({change_pct:+.1f}%)")
        
        # Update position prices
        position_manager.update_positions_price(symbol, new_price)
    
    # Show updated portfolio
    updated_portfolio = portfolio.get_portfolio_data(updated_prices)
    print(f"\n  📊 Updated Portfolio:")
    print(f"    💰 New Value: ${updated_portfolio['total_portfolio_value']:.2f}")
    print(f"    📈 New P&L: ${updated_portfolio['total_unrealized_pnl']:.2f} ({updated_portfolio['total_unrealized_pnl_percent']:.1f}%)")
    
    print("\n✨ Integration Demo Complete!")
    print("=" * 50)
    
    return {
        "trade_tracker": trade_tracker,
        "position_manager": position_manager, 
        "portfolio": portfolio,
        "final_portfolio_data": updated_portfolio
    }

if __name__ == "__main__":
    result = demonstrate_enhanced_models()
    
    # Clean up demo files
    import os
    demo_files = ["./demo_trades.json", "./demo_positions.json", "./demo_portfolio.json"]
    for file_path in demo_files:
        if os.path.exists(file_path):
            os.remove(file_path)
    print("\n🧹 Demo files cleaned up")