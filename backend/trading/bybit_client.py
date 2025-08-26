import os
from pybit.unified_trading import HTTP
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 명시적 로드
load_dotenv()

class BybitClient:
    def __init__(self):
        """Bybit API 클라이언트 초기화"""
        # 환경변수 로딩 디버깅
        self.api_key = os.getenv("BYBIT_API_KEY", "")
        self.api_secret = os.getenv("BYBIT_API_SECRET", "")
        self.testnet = os.getenv("BYBIT_TESTNET", "false").lower() == "true"
        
        # 디버깅 정보 출력
        print(f"🔍 환경변수 디버깅:")
        print(f"   API_KEY 길이: {len(self.api_key)} ({'설정됨' if self.api_key else '비어있음'})")
        print(f"   API_SECRET 길이: {len(self.api_secret)} ({'설정됨' if self.api_secret else '비어있음'})")
        print(f"   TESTNET: {self.testnet}")
        
        # 안전 거래 설정
        self.max_trade_amount = float(os.getenv("MAX_TRADE_AMOUNT_USD", "30.0"))
        self.min_order_size = float(os.getenv("MIN_ORDER_SIZE_USD", "5.0"))
        self.max_position_percentage = float(os.getenv("MAX_POSITION_PERCENTAGE", "80.0"))
        self.stop_loss_percentage = float(os.getenv("STOP_LOSS_PERCENTAGE", "5.0"))
        
        # API 키가 있는 경우에만 인증 사용
        if self.api_key and self.api_secret:
            self.session = HTTP(
                testnet=self.testnet,
                api_key=self.api_key,
                api_secret=self.api_secret,
            )
            self.authenticated = True
            print(f"🔗 Bybit 클라이언트 초기화 완료 (인증됨, 테스트넷: {self.testnet})")
        else:
            # 공개 API만 사용 (가격 조회 등)
            self.session = HTTP(testnet=self.testnet)
            self.authenticated = False
            print(f"🔗 Bybit 클라이언트 초기화 완료 (공개 API만, 테스트넷: {self.testnet})")
    
    async def get_current_price(self, symbol: str = "BTCUSDT") -> float:
        """현재 비트코인 가격 조회"""
        try:
            response = self.session.get_tickers(category="spot", symbol=symbol)
            if response["retCode"] == 0:
                price = float(response["result"]["list"][0]["lastPrice"])
                return price
            return 0.0
        except Exception as e:
            print(f"가격 조회 오류: {e}")
            return 0.0
    
    async def get_balance(self) -> Dict[str, Any]:
        """계정 잔고 조회"""
        if not self.authenticated:
            print("❌ API 키가 설정되지 않았습니다. 실제 잔고를 조회할 수 없습니다.")
            return {}
        
        try:
            response = self.session.get_wallet_balance(accountType="UNIFIED")
            
            if response["retCode"] == 0 and response["result"]["list"]:
                balances = {}
                coin_list = response["result"]["list"][0]["coin"]
                
                for coin in coin_list:
                    try:
                        coin_name = coin.get("coin", "Unknown")
                        wallet_balance = coin.get("walletBalance", "0") or "0"
                        available_balance = coin.get("availableToWithdraw", "") or coin.get("equity", "0") or "0"
                        
                        # availableToWithdraw가 빈 문자열인 경우 equity 사용
                        if available_balance == "":
                            available_balance = coin.get("equity", "0") or "0"
                        
                        balance_float = float(wallet_balance)
                        available_float = float(available_balance)
                        
                        if balance_float > 0:
                            balances[coin_name] = {
                                "balance": balance_float,
                                "available": available_float
                            }
                    except (ValueError, TypeError) as e:
                        print(f"❌ 코인 {coin_name} 잔고 파싱 오류: {e}")
                        continue
                        
                print(f"💰 실제 잔고 조회 완료: {len(balances)}개 코인")
                return balances
            else:
                print(f"❌ 잔고 조회 응답 오류: {response}")
                return {}
        except Exception as e:
            print(f"❌ 잔고 조회 오류: {e}")
            return {}
    
    async def calculate_safe_order_size(self, symbol: str = "BTCUSDT", side: str = "Buy") -> Optional[str]:
        """안전한 주문 크기 계산 (30달러 예산 기준)"""
        try:
            current_price = await self.get_current_price(symbol)
            if current_price <= 0:
                return None
            
            balance = await self.get_balance()
            usdt_balance = balance.get("USDT", {}).get("available", 0)
            
            # 사용 가능한 금액 계산 (최대 거래 금액과 잔고 중 작은 값)
            available_amount = min(usdt_balance, self.max_trade_amount)
            
            if side == "Buy":
                # 매수: USDT 잔고 기준으로 계산
                if available_amount < self.min_order_size:
                    print(f"❌ 잔고 부족: ${available_amount:.2f} (최소 주문: ${self.min_order_size})")
                    return None
                
                # 최대 포지션 비율 적용
                max_buy_amount = available_amount * (self.max_position_percentage / 100)
                btc_qty = max_buy_amount / current_price
                
                # 최소 주문 크기 확인
                if max_buy_amount < self.min_order_size:
                    print(f"❌ 주문 금액이 너무 작음: ${max_buy_amount:.2f}")
                    return None
                
                return f"{btc_qty:.6f}"
                
            else:  # Sell
                # 매도: BTC 잔고 기준으로 계산
                btc_balance = balance.get("BTC", {}).get("available", 0)
                if btc_balance <= 0:
                    print("❌ 매도할 BTC가 없습니다")
                    return None
                
                # 전체 BTC 매도
                return f"{btc_balance:.6f}"
                
        except Exception as e:
            print(f"주문 크기 계산 오류: {e}")
            return None

    async def place_order(self, 
                         symbol: str = "BTCUSDT",
                         side: str = "Buy",  # Buy or Sell
                         order_type: str = "Market",
                         qty: Optional[str] = None) -> Dict[str, Any]:
        """주문 실행 (안전 장치 포함)"""
        # 주문 크기가 지정되지 않은 경우 안전한 크기 계산
        if qty is None:
            qty = await self.calculate_safe_order_size(symbol, side)
            if qty is None:
                return {"success": False, "error": "안전한 주문 크기를 계산할 수 없습니다"}
        
        if not self.authenticated:
            current_price = await self.get_current_price(symbol)
            order_value = float(qty) * current_price
            print(f"🔒 실제 거래 모드 (API 키 필요): {side} {qty} {symbol} (약 ${order_value:.2f})")
            return {
                "success": False,
                "error": "API 키가 설정되지 않았습니다. .env 파일에 BYBIT_API_KEY와 BYBIT_API_SECRET을 설정하세요."
            }
        
        try:
            # 주문 전 최종 안전 검사
            current_price = await self.get_current_price(symbol)
            order_value = float(qty) * current_price
            
            if order_value > self.max_trade_amount:
                return {
                    "success": False, 
                    "error": f"주문 금액이 최대 한도를 초과합니다: ${order_value:.2f} > ${self.max_trade_amount}"
                }
            
            if order_value < self.min_order_size:
                return {
                    "success": False,
                    "error": f"주문 금액이 최소 한도보다 작습니다: ${order_value:.2f} < ${self.min_order_size}"
                }
            
            print(f"🚀 실제 주문 실행: {side} {qty} {symbol} (${order_value:.2f})")
            
            response = self.session.place_order(
                category="spot",
                symbol=symbol,
                side=side,
                orderType=order_type,
                qty=qty
            )
            
            if response["retCode"] == 0:
                print(f"✅ 주문 성공: {side} {qty} {symbol} (${order_value:.2f})")
                return {
                    "success": True,
                    "order_id": response["result"]["orderId"],
                    "data": response["result"]
                }
            else:
                print(f"❌ 주문 실패: {response['retMsg']}")
                return {"success": False, "error": response["retMsg"]}
                
        except Exception as e:
            print(f"주문 실행 오류: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_order_history(self, symbol: str = "BTCUSDT", limit: int = 50) -> list:
        """주문 내역 조회"""
        if not self.authenticated:
            print("❌ API 키가 설정되지 않았습니다. 실제 거래 내역을 조회할 수 없습니다.")
            return []
        
        try:
            response = self.session.get_order_history(
                category="spot",
                symbol=symbol,
                limit=limit
            )
            
            if response["retCode"] == 0:
                return response["result"]["list"]
            else:
                print(f"주문 내역 조회 응답 오류: {response}")
                return []
            
        except Exception as e:
            print(f"주문 내역 조회 오류: {e}")
            return []
    
    async def get_kline_data(self, 
                           symbol: str = "BTCUSDT",
                           interval: str = "1",  # 1분봉
                           limit: int = 200) -> list:
        """캔들스틱 데이터 조회"""
        try:
            response = self.session.get_kline(
                category="spot",
                symbol=symbol,
                interval=interval,
                limit=limit
            )
            
            if response["retCode"] == 0:
                return response["result"]["list"]
            return []
            
        except Exception as e:
            print(f"캔들 데이터 조회 오류: {e}")
            return []