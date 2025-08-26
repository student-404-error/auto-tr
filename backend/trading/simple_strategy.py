import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from .bybit_client import BybitClient

class TradingStrategy:
    def __init__(self, client: BybitClient):
        self.client = client
        self.is_active = False
        self.position = None  # None, 'long', 'short'
        self.last_signal = None
        self.trade_amount = "0.001"  # BTC 거래량
        
        # 전략 파라미터
        self.rsi_period = 14
        self.rsi_oversold = 30
        self.rsi_overbought = 70
        self.ma_short = 20
        self.ma_long = 50
        
        print("📊 트레이딩 전략 초기화 완료")
    
    async def start_trading(self):
        """자동매매 시작"""
        self.is_active = True
        print("🤖 자동매매 시작됨")
        
        while self.is_active:
            try:
                await self.execute_strategy()
                await asyncio.sleep(60)  # 1분마다 실행
            except Exception as e:
                print(f"전략 실행 오류: {e}")
                await asyncio.sleep(60)
    
    def stop_trading(self):
        """자동매매 중지"""
        self.is_active = False
        print("🛑 자동매매 중지됨")
    
    async def execute_strategy(self):
        """메인 전략 실행"""
        # 1. 시장 데이터 수집
        kline_data = await self.client.get_kline_data(limit=100)
        if not kline_data:
            return
        
        # 2. 기술적 분석
        signal = await self.analyze_market(kline_data)
        
        # 3. 거래 실행
        if signal and signal != self.last_signal:
            await self.execute_trade(signal)
            self.last_signal = signal
    
    async def analyze_market(self, kline_data: list) -> Optional[str]:
        """간단한 가격 기반 분석"""
        try:
            if len(kline_data) < 5:
                return None
            
            # 최근 5개 캔들의 종가 추출
            recent_prices = []
            for kline in kline_data[-5:]:
                close_price = float(kline[4])  # close price
                recent_prices.append(close_price)
            
            current_price = recent_prices[-1]
            avg_price = sum(recent_prices) / len(recent_prices)
            
            print(f"📈 현재 가격: ${current_price:.2f}, 평균: ${avg_price:.2f}")
            
            # 간단한 매매 신호
            # 매수 신호: 현재가가 평균보다 2% 이상 낮을 때
            if current_price < avg_price * 0.98 and self.position != 'long':
                return 'buy'
            
            # 매도 신호: 현재가가 평균보다 2% 이상 높을 때
            elif current_price > avg_price * 1.02 and self.position == 'long':
                return 'sell'
            
            return None
            
        except Exception as e:
            print(f"시장 분석 오류: {e}")
            return None
    
    async def execute_trade(self, signal: str):
        """거래 실행"""
        try:
            if signal == 'buy':
                result = await self.client.place_order(
                    side="Buy",
                    qty=self.trade_amount
                )
                if result.get('success'):
                    self.position = 'long'
                    print(f"🟢 매수 주문 실행: {self.trade_amount} BTC")
                
            elif signal == 'sell' and self.position == 'long':
                result = await self.client.place_order(
                    side="Sell",
                    qty=self.trade_amount
                )
                if result.get('success'):
                    self.position = None
                    print(f"🔴 매도 주문 실행: {self.trade_amount} BTC")
                    
        except Exception as e:
            print(f"거래 실행 오류: {e}")
    
    def get_strategy_status(self) -> Dict[str, Any]:
        """전략 상태 반환"""
        return {
            "is_active": self.is_active,
            "position": self.position,
            "last_signal": self.last_signal,
            "trade_amount": self.trade_amount,
            "parameters": {
                "rsi_period": self.rsi_period,
                "rsi_oversold": self.rsi_oversold,
                "rsi_overbought": self.rsi_overbought,
                "ma_short": self.ma_short,
                "ma_long": self.ma_long
            }
        }