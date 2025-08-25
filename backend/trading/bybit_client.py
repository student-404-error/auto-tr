import os
from pybit.unified_trading import HTTP
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime

class BybitClient:
    def __init__(self):
        """Bybit API 클라이언트 초기화"""
        self.api_key = os.getenv("BYBIT_API_KEY", "")
        self.api_secret = os.getenv("BYBIT_API_SECRET", "")
        self.testnet = os.getenv("BYBIT_TESTNET", "true").lower() == "true"
        
        # HTTP 클라이언트 초기화
        self.session = HTTP(
            testnet=self.testnet,
            api_key=self.api_key,
            api_secret=self.api_secret,
        )
        
        print(f"🔗 Bybit 클라이언트 초기화 완료 (테스트넷: {self.testnet})")
    
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
        try:
            response = self.session.get_wallet_balance(accountType="UNIFIED")
            if response["retCode"] == 0:
                balances = {}
                for coin in response["result"]["list"][0]["coin"]:
                    if float(coin["walletBalance"]) > 0:
                        balances[coin["coin"]] = {
                            "balance": float(coin["walletBalance"]),
                            "available": float(coin["availableToWithdraw"])
                        }
                return balances
            return {}
        except Exception as e:
            print(f"잔고 조회 오류: {e}")
            return {}
    
    async def place_order(self, 
                         symbol: str = "BTCUSDT",
                         side: str = "Buy",  # Buy or Sell
                         order_type: str = "Market",
                         qty: str = "0.001") -> Dict[str, Any]:
        """주문 실행"""
        try:
            response = self.session.place_order(
                category="spot",
                symbol=symbol,
                side=side,
                orderType=order_type,
                qty=qty
            )
            
            if response["retCode"] == 0:
                print(f"✅ 주문 성공: {side} {qty} {symbol}")
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
        try:
            response = self.session.get_order_history(
                category="spot",
                symbol=symbol,
                limit=limit
            )
            
            if response["retCode"] == 0:
                return response["result"]["list"]
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