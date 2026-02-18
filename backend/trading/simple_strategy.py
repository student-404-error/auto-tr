import asyncio
from datetime import datetime
from typing import Dict, Any, Optional

from .bybit_client import BybitClient
from models.trade_tracker_db import TradeTrackerDB

class TradingStrategy:
    def __init__(self, client: BybitClient, trade_tracker: TradeTrackerDB):
        self.client = client
        self.trade_tracker = trade_tracker
        self.is_active = False
        self.position = None  # None, 'long', 'short'
        self.last_signal = None
        self.trade_amount = None  # 동적으로 계산됨 (30달러 예산 기준)
        self.last_reason = None
        self.last_indicators = {}
        
        # 전략 파라미터
        self.rsi_period = 14
        self.rsi_oversold = 30
        self.rsi_overbought = 70
        self.ma_short = 20
        self.ma_long = 50
        
        print("📊 트레이딩 전략 초기화 완료")
    
    async def start_trading(self):
        """자동매매 시작"""
        await self._restore_state_from_db()
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
        
        # 3. 신호 기록 및 거래 실행 (모든 신호 기록)
        if signal:
            # 모든 신호를 기록 (연속 신호도 포함)
            await self.record_signal(signal)
            
            # 실제 거래는 buy/sell만 실행 (연속 거래 방지)
            if signal in ['buy', 'sell'] and signal != self.last_signal:
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
            self.last_indicators = {
                "close": current_price,
                "avg_5": avg_price,
            }
            
            print(f"📈 현재 가격: ${current_price:.2f}, 평균: ${avg_price:.2f}")
            
            # 간단한 매매 신호
            # 매수 신호: 현재가가 평균보다 2% 이상 낮을 때
            if current_price < avg_price * 0.98 and self.position != 'long':
                print(f"🟢 Buy signal!!")
                self.last_reason = "below_avg_2pct"
                return 'buy'
            
            # 매도 신호: 현재가가 평균보다 2% 이상 높을 때
            elif current_price > avg_price * 1.02 and self.position == 'long':
                print(f"🔴 Sell signal!!")
                self.last_reason = "above_avg_2pct"
                return 'sell'
            
            # 보류 신호: 매매 조건에 맞지 않을 때
            else:
                print(f"🟡 Hold signal - 현재 시장 상황에서는 거래하지 않음")
                self.last_reason = "no_entry_or_exit"
                return 'hold'
            
        except Exception as e:
            print(f"시장 분석 오류: {e}")
            return None
    
    async def record_signal(self, signal: str):
        """신호 기록 (거래 실행 없이 신호만 기록)"""
        try:
            current_price = await self.client.get_current_price()
            
            # hold 신호의 경우 거래량을 0으로 설정
            if signal == 'hold':
                await self.trade_tracker.add_trade(
                    "BTCUSDT",
                    "Hold",  # 보류 상태
                    0.0,  # 거래량 0
                    current_price,
                    signal="hold",
                )
                print(f"🟡 보류 신호 기록: 현재가 ${current_price:.2f}")
        except Exception as e:
            print(f"신호 기록 오류: {e}")

    async def execute_trade(self, signal: str):
        """거래 실행 (30달러 예산 기준 안전 거래)"""
        try:
            current_price = await self.client.get_current_price()
            
            if signal == "buy":
                # 안전한 매수 수량 계산
                safe_qty = await self.client.calculate_safe_order_size("BTCUSDT", "Buy")
                if not safe_qty:
                    print("❌ 안전한 매수 수량을 계산할 수 없습니다")
                    return
                
                result = await self.client.place_order(
                    side="Buy",
                    qty=safe_qty,
                )
                if result.get("success"):
                    self.position = "long"
                    self.trade_amount = safe_qty  # 실제 거래된 수량 저장
                    await self.trade_tracker.add_trade(
                        "BTCUSDT",
                        "Buy",
                        float(safe_qty),
                        current_price,
                        signal="buy",
                    )
                    order_value = float(safe_qty) * current_price
                    print(f"🟢 매수 주문 실행: {safe_qty} BTC (${order_value:.2f})")
                else:
                    print(f"❌ 매수 주문 실패: {result.get('error', '알 수 없는 오류')}")

            elif signal == "sell" and self.position == "long":
                # 보유 중인 BTC 전량 매도
                result = await self.client.place_order(
                    side="Sell",
                    qty=None,  # 자동으로 보유량 계산
                )
                if result.get("success"):
                    self.position = None
                    # 실제 매도된 수량 사용
                    sold_qty = self.trade_amount if self.trade_amount else "0"
                    await self.trade_tracker.add_trade(
                        "BTCUSDT",
                        "Sell",
                        float(sold_qty),
                        current_price,
                        signal="sell",
                    )
                    order_value = float(sold_qty) * current_price
                    print(f"🔴 매도 주문 실행: {sold_qty} BTC (${order_value:.2f})")
                    self.trade_amount = None  # 포지션 정리
                else:
                    print(f"❌ 매도 주문 실패: {result.get('error', '알 수 없는 오류')}")

        except Exception as e:
            print(f"거래 실행 오류: {e}")

    async def _restore_state_from_db(self):
        """DB 거래 기록 기반으로 메모리 포지션 상태 복원."""
        try:
            positions = await self.trade_tracker.get_current_positions()
            symbol_positions = positions.get("BTCUSDT", {})
            spot = symbol_positions.get("spot", {})
            qty = float(spot.get("total_quantity", 0.0))
            if qty > 0:
                self.position = "long"
                self.trade_amount = f"{qty:.8f}".rstrip("0").rstrip(".")
            else:
                self.position = None
                self.trade_amount = None
        except Exception as e:
            print(f"상태 복원 오류: {e}")
    
    def get_strategy_status(self) -> Dict[str, Any]:
        """전략 상태 반환"""
        return {
            "strategy": "simple",
            "is_active": self.is_active,
            "position": self.position,
            "last_signal": self.last_signal,
            "last_reason": self.last_reason,
            "trade_amount": self.trade_amount,
            "indicators": self.last_indicators,
            "parameters": {
                "rsi_period": self.rsi_period,
                "rsi_oversold": self.rsi_oversold,
                "rsi_overbought": self.rsi_overbought,
                "ma_short": self.ma_short,
                "ma_long": self.ma_long
            }
        }
