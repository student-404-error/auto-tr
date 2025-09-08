"""
다중 암호화폐 지원 백엔드 통합 예제
이 파일은 새로 구현된 다중 암호화폐 지원 기능들이 어떻게 함께 작동하는지 보여줍니다.
"""

import asyncio
from datetime import datetime
import sys
import os

# 상위 디렉터리의 모듈들을 import하기 위한 경로 설정
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trading.bybit_client import BybitClient
from trading.market_data_service import MarketDataService
from trading.multi_asset_strategy import MultiAssetTradingEngine
from models.trade_tracker import TradeTracker
from models.enhanced_trade_tracker import EnhancedTradeTracker

class MultiAssetTradingSystem:
    """다중 암호화폐 트레이딩 시스템 통합 클래스"""
    
    def __init__(self):
        print("🚀 다중 암호화폐 트레이딩 시스템 초기화 중...")
        
        # 1. 기본 컴포넌트 초기화
        self.bybit_client = BybitClient()
        self.market_service = MarketDataService(self.bybit_client)
        self.trade_tracker = TradeTracker("./multi_asset_trades.json")
        self.enhanced_tracker = EnhancedTradeTracker("./enhanced_multi_asset_trades.json")
        
        # 2. 다중 자산 트레이딩 엔진 초기화
        self.trading_engine = MultiAssetTradingEngine(
            self.bybit_client,
            self.market_service,
            self.trade_tracker
        )
        
        print("✅ 다중 암호화폐 트레이딩 시스템 초기화 완료")
        print(f"   지원 암호화폐: {list(self.bybit_client.supported_symbols.keys())}")
    
    async def demonstrate_multi_asset_features(self):
        """다중 자산 기능 시연"""
        print("\n" + "="*60)
        print("🎯 다중 암호화폐 지원 기능 시연")
        print("="*60)
        
        # 1. 다중 가격 조회 시연
        await self._demo_multi_price_feeds()
        
        # 2. 다중 자산 시장 데이터 시연
        await self._demo_market_data_service()
        
        # 3. 향상된 거래 추적 시연
        await self._demo_enhanced_trade_tracking()
        
        # 4. 포트폴리오 관리 시연
        await self._demo_portfolio_management()
        
        print("\n✅ 모든 기능 시연 완료!")
    
    async def _demo_multi_price_feeds(self):
        """다중 가격 피드 시연"""
        print("\n📊 1. 다중 가격 피드 시연")
        print("-" * 40)
        
        try:
            # 모든 지원 암호화폐 가격 조회
            prices = await self.bybit_client.get_multiple_prices()
            
            print("현재 가격:")
            for symbol, price in prices.items():
                crypto_name = symbol.replace("USDT", "")
                print(f"  {crypto_name}: ${price:,.4f}")
            
            # 개별 가격 조회
            btc_price = await self.bybit_client.get_current_price("BTCUSDT")
            xrp_price = await self.bybit_client.get_current_price("XRPUSDT")
            sol_price = await self.bybit_client.get_current_price("SOLUSDT")
            
            print(f"\n개별 조회:")
            print(f"  BTC: ${btc_price:,.2f}")
            print(f"  XRP: ${xrp_price:.4f}")
            print(f"  SOL: ${sol_price:.2f}")
            
        except Exception as e:
            print(f"❌ 가격 조회 오류: {e}")
    
    async def _demo_market_data_service(self):
        """시장 데이터 서비스 시연"""
        print("\n📈 2. 통합 시장 데이터 서비스 시연")
        print("-" * 40)
        
        try:
            # 시장 요약 정보
            market_summary = await self.market_service.get_market_summary()
            print(f"활성 피드: {market_summary['active_feeds']}/{market_summary['total_symbols']}")
            
            # 캐시 상태
            cache_status = self.market_service.get_cache_status()
            print(f"가격 캐시: {cache_status['price_cache_count']}개")
            print(f"캔들 캐시: {cache_status['kline_cache_count']}개")
            
            # 다중 캔들 데이터 조회
            kline_data = await self.market_service.get_multiple_kline_data(limit=5)
            print(f"\n캔들 데이터 조회:")
            for symbol, data in kline_data.items():
                crypto_name = symbol.replace("USDT", "")
                print(f"  {crypto_name}: {len(data)}개 캔들")
            
        except Exception as e:
            print(f"❌ 시장 데이터 오류: {e}")
    
    async def _demo_enhanced_trade_tracking(self):
        """향상된 거래 추적 시연"""
        print("\n📝 3. 향상된 거래 추적 시연")
        print("-" * 40)
        
        try:
            # 테스트 거래 추가 (다양한 포지션 타입)
            test_trades = [
                {
                    "symbol": "BTCUSDT",
                    "side": "Buy",
                    "quantity": 0.001,
                    "price": 65000.0,
                    "position_type": "long",
                    "signal": "buy"
                },
                {
                    "symbol": "XRPUSDT", 
                    "side": "Buy",
                    "quantity": 100.0,
                    "price": 0.52,
                    "position_type": "spot",
                    "signal": "buy"
                },
                {
                    "symbol": "SOLUSDT",
                    "side": "Buy", 
                    "quantity": 0.5,
                    "price": 98.45,
                    "position_type": "long",
                    "signal": "buy"
                }
            ]
            
            print("테스트 거래 추가:")
            for trade in test_trades:
                self.enhanced_tracker.add_trade(**trade)
                print(f"  ✅ {trade['symbol']} {trade['side']} {trade['quantity']} ({trade['position_type']})")
            
            # 포트폴리오 요약
            portfolio_summary = self.enhanced_tracker.get_portfolio_summary()
            print(f"\n포트폴리오 요약:")
            print(f"  총 거래: {portfolio_summary['total_trades']}개")
            print(f"  총 심볼: {portfolio_summary['total_symbols']}개")
            print(f"  열린 포지션: {portfolio_summary['open_positions']}개")
            print(f"  총 투자금: ${portfolio_summary['total_invested']:.2f}")
            
            # 열린 포지션 조회
            open_positions = self.enhanced_tracker.get_all_open_positions()
            print(f"\n열린 포지션:")
            for symbol, positions in open_positions.items():
                crypto_name = symbol.replace("USDT", "")
                for pos_type, pos in positions.items():
                    print(f"  {crypto_name} ({pos_type}): {pos['quantity']} @ ${pos['average_price']:.4f}")
            
        except Exception as e:
            print(f"❌ 거래 추적 오류: {e}")
    
    async def _demo_portfolio_management(self):
        """포트폴리오 관리 시연"""
        print("\n💼 4. 포트폴리오 관리 시연")
        print("-" * 40)
        
        try:
            # 기존 트레이더의 다중 자산 기능
            multi_summary = self.trade_tracker.get_multi_asset_summary()
            print(f"다중 자산 요약:")
            print(f"  총 심볼: {multi_summary['total_symbols']}개")
            print(f"  총 포지션: {multi_summary['total_positions']}개")
            
            position_types = multi_summary['position_types']
            print(f"  포지션 타입별:")
            print(f"    Spot: {position_types['spot']}개")
            print(f"    Long: {position_types['long']}개") 
            print(f"    Short: {position_types['short']}개")
            
            # 트레이딩 엔진 상태
            engine_status = self.trading_engine.get_strategy_status()
            print(f"\n트레이딩 엔진 상태:")
            print(f"  활성화: {engine_status['is_active']}")
            print(f"  지원 심볼: {len(engine_status['supported_symbols'])}개")
            print(f"  현재 포지션: {len(engine_status['positions'])}개")
            
            # 포트폴리오 요약 (트레이딩 엔진)
            portfolio_summary = await self.trading_engine.get_portfolio_summary()
            if portfolio_summary:
                print(f"  마지막 업데이트: {portfolio_summary.get('timestamp', 'N/A')}")
            
        except Exception as e:
            print(f"❌ 포트폴리오 관리 오류: {e}")
    
    async def run_integration_test(self):
        """통합 테스트 실행"""
        print("\n🧪 통합 테스트 시작")
        print("="*60)
        
        try:
            # 시장 데이터 서비스 시작 (백그라운드)
            print("📡 시장 데이터 피드 시작...")
            market_task = asyncio.create_task(self.market_service.start_price_feeds())
            
            # 잠시 대기하여 초기 데이터 로드
            await asyncio.sleep(5)
            
            # 기능 시연
            await self.demonstrate_multi_asset_features()
            
            # 시장 데이터 서비스 중지
            print("\n📡 시장 데이터 피드 중지...")
            self.market_service.stop_price_feeds()
            
            # 백그라운드 태스크 정리
            market_task.cancel()
            try:
                await market_task
            except asyncio.CancelledError:
                pass
            
            print("\n✅ 통합 테스트 완료!")
            
        except Exception as e:
            print(f"❌ 통합 테스트 오류: {e}")
            import traceback
            traceback.print_exc()

async def main():
    """메인 실행 함수"""
    print("🚀 다중 암호화폐 지원 백엔드 통합 예제")
    print("="*60)
    
    # 시스템 초기화
    system = MultiAssetTradingSystem()
    
    # 통합 테스트 실행
    await system.run_integration_test()
    
    print("\n🎉 예제 실행 완료!")
    print("이제 다음 기능들을 사용할 수 있습니다:")
    print("  ✅ BTC, XRP, SOL 다중 암호화폐 지원")
    print("  ✅ 통합 시장 데이터 서비스")
    print("  ✅ 다중 자산 트레이딩 엔진")
    print("  ✅ 향상된 거래 추적 (포지션 타입 지원)")
    print("  ✅ 달러 기반 거래 기록")
    print("  ✅ 포트폴리오 레벨 리스크 관리")

if __name__ == "__main__":
    asyncio.run(main())