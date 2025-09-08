#!/usr/bin/env python3
"""
Test script for enhanced data models
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.enhanced_trade import EnhancedTradeTracker, EnhancedTrade
from models.position_manager import PositionManager, Position
from models.multi_asset_portfolio import MultiAssetPortfolio

def test_enhanced_trade_tracker():
    """Test enhanced trade tracker functionality"""
    print("🧪 Testing EnhancedTradeTracker...")
    
    # Create tracker with test file
    tracker = EnhancedTradeTracker("./test_enhanced_trades.json")
    
    # Add some test trades
    trade1 = tracker.add_trade(
        symbol="BTCUSDT",
        side="buy",
        position_type="long",
        quantity=0.001,
        price=50000.0,
        dollar_amount=50.0,
        signal="test_signal"
    )
    
    trade2 = tracker.add_trade(
        symbol="XRPUSDT", 
        side="buy",
        position_type="spot",
        quantity=100.0,
        price=0.5,
        dollar_amount=50.0,
        signal="manual"
    )
    
    # Test P&L calculation
    btc_pnl = tracker.calculate_asset_pnl("BTCUSDT", 55000.0)
    print(f"BTC P&L: {btc_pnl}")
    
    xrp_pnl = tracker.calculate_asset_pnl("XRPUSDT", 0.6)
    print(f"XRP P&L: {xrp_pnl}")
    
    # Test trade queries
    recent_trades = tracker.get_recent_trades(5)
    print(f"Recent trades: {len(recent_trades)}")
    
    signal_trades = tracker.get_trades_with_signals(5)
    print(f"Signal trades: {len(signal_trades)}")
    
    print("✅ EnhancedTradeTracker tests passed!")
    return tracker

def test_position_manager():
    """Test position manager functionality"""
    print("\n🧪 Testing PositionManager...")
    
    # Create manager with test file
    manager = PositionManager("./test_positions.json")
    
    # Open some test positions
    pos1 = manager.open_position(
        symbol="BTCUSDT",
        position_type="long",
        entry_price=50000.0,
        quantity=0.001,
        dollar_amount=50.0,
        current_price=55000.0
    )
    
    pos2 = manager.open_position(
        symbol="XRPUSDT",
        position_type="short", 
        entry_price=0.6,
        quantity=100.0,
        dollar_amount=60.0,
        current_price=0.5
    )
    
    # Test position queries
    open_positions = manager.get_open_positions()
    print(f"Open positions: {len(open_positions)}")
    
    btc_positions = manager.get_open_positions("BTCUSDT")
    print(f"BTC positions: {len(btc_positions)}")
    
    # Test price updates
    manager.update_positions_price("BTCUSDT", 60000.0)
    
    # Test position summary
    summary = manager.get_positions_summary()
    print(f"Position summary: {summary}")
    
    # Close a position
    closed_pos = manager.close_position(pos1.id)
    print(f"Closed position: {closed_pos.id if closed_pos else 'None'}")
    
    print("✅ PositionManager tests passed!")
    return manager

def test_multi_asset_portfolio():
    """Test multi-asset portfolio functionality"""
    print("\n🧪 Testing MultiAssetPortfolio...")
    
    # Create portfolio with test files
    tracker = EnhancedTradeTracker("./test_enhanced_trades.json")
    manager = PositionManager("./test_positions.json")
    portfolio = MultiAssetPortfolio(
        "./test_portfolio_history.json",
        tracker,
        manager
    )
    
    # Test current prices
    current_prices = {
        "BTCUSDT": 55000.0,
        "XRPUSDT": 0.6,
        "SOLUSDT": 100.0
    }
    
    # Get portfolio data
    portfolio_data = portfolio.get_portfolio_data(current_prices)
    print(f"Portfolio value: ${portfolio_data['total_portfolio_value']:.2f}")
    print(f"Total P&L: ${portfolio_data['total_unrealized_pnl']:.2f}")
    print(f"Assets: {portfolio_data['asset_count']}")
    
    # Add snapshot
    portfolio.add_portfolio_snapshot(current_prices)
    
    # Test performance stats
    performance = portfolio.get_performance_stats()
    print(f"Performance stats: {performance}")
    
    # Test asset allocation
    allocation = portfolio.get_asset_allocation()
    print(f"Asset allocation: {allocation}")
    
    print("✅ MultiAssetPortfolio tests passed!")
    return portfolio

def cleanup_test_files():
    """Clean up test files"""
    test_files = [
        "./test_enhanced_trades.json",
        "./test_positions.json", 
        "./test_portfolio_history.json"
    ]
    
    for file_path in test_files:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Cleaned up: {file_path}")

def main():
    """Run all tests"""
    print("🚀 Starting enhanced models tests...\n")
    
    try:
        # Run tests
        tracker = test_enhanced_trade_tracker()
        manager = test_position_manager()
        portfolio = test_multi_asset_portfolio()
        
        print("\n🎉 All tests passed successfully!")
        
        # Show summary
        print("\n📊 Test Summary:")
        print(f"- Enhanced trades: {len(tracker.trades)}")
        print(f"- Positions: {len(manager.positions)}")
        print(f"- Portfolio snapshots: {len(portfolio.history)}")
        print(f"- Supported assets: {len(portfolio.SUPPORTED_ASSETS)}")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up test files
        print("\n🧹 Cleaning up test files...")
        cleanup_test_files()

if __name__ == "__main__":
    main()