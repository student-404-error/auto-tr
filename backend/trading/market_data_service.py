import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import os
from .bybit_client import BybitClient

class MarketDataService:
    """통합 시장 데이터 서비스 - 다중 암호화폐 지원"""
    
    def __init__(self, client: BybitClient):
        self.client = client
        self.supported_symbols = client.supported_symbols
        self.price_cache = {}
        self.kline_cache = {}
        self.last_update = {}
        self.cache_duration = 60  # 캐시 유효 시간 (초)
        self.is_running = False
        
        # 가격 피드 관리
        self.price_feeds = {}
        self.subscribers = {}  # 가격 업데이트 구독자들
        
        print(f"📊 MarketDataService 초기화 완료 - 지원 심볼: {list(self.supported_symbols.keys())}")
    
    async def start_price_feeds(self):
        """실시간 가격 피드 시작"""
        self.is_running = True
        print("🚀 실시간 가격 피드 시작")
        
        while self.is_running:
            try:
                await self._update_all_prices()
                await asyncio.sleep(30)  # 30초마다 가격 업데이트
            except Exception as e:
                print(f"가격 피드 업데이트 오류: {e}")
                await asyncio.sleep(30)
    
    def stop_price_feeds(self):
        """실시간 가격 피드 중지"""
        self.is_running = False
        print("🛑 실시간 가격 피드 중지")
    
    async def _update_all_prices(self):
        """모든 지원 암호화폐 가격 업데이트"""
        try:
            symbols = list(self.supported_symbols.values())
            prices = await self.client.get_multiple_prices(symbols)
            
            current_time = datetime.now()
            
            for symbol, price in prices.items():
                if price > 0:
                    old_price = self.price_cache.get(symbol, {}).get("price", 0)
                    
                    self.price_cache[symbol] = {
                        "price": price,
                        "timestamp": current_time.isoformat(),
                        "change": price - old_price if old_price > 0 else 0,
                        "change_percent": ((price - old_price) / old_price * 100) if old_price > 0 else 0
                    }
                    self.last_update[symbol] = current_time
                    
                    # 구독자들에게 가격 업데이트 알림
                    await self._notify_price_subscribers(symbol, self.price_cache[symbol])
            
            print(f"💰 가격 업데이트 완료: {len([p for p in prices.values() if p > 0])}개 심볼")
            
        except Exception as e:
            print(f"가격 업데이트 오류: {e}")
    
    async def _notify_price_subscribers(self, symbol: str, price_data: Dict[str, Any]):
        """가격 업데이트 구독자들에게 알림"""
        if symbol in self.subscribers:
            for callback in self.subscribers[symbol]:
                try:
                    await callback(symbol, price_data)
                except Exception as e:
                    print(f"구독자 알림 오류 ({symbol}): {e}")
    
    def subscribe_to_price_updates(self, symbol: str, callback):
        """가격 업데이트 구독"""
        if symbol not in self.subscribers:
            self.subscribers[symbol] = []
        self.subscribers[symbol].append(callback)
        print(f"📡 가격 업데이트 구독 추가: {symbol}")
    
    def unsubscribe_from_price_updates(self, symbol: str, callback):
        """가격 업데이트 구독 해제"""
        if symbol in self.subscribers and callback in self.subscribers[symbol]:
            self.subscribers[symbol].remove(callback)
            print(f"📡 가격 업데이트 구독 해제: {symbol}")
    
    async def get_current_price(self, symbol: str) -> float:
        """현재 가격 조회 (캐시 우선)"""
        # 캐시 확인
        if symbol in self.price_cache and self._is_cache_valid(symbol):
            return self.price_cache[symbol]["price"]
        
        # 캐시가 없거나 만료된 경우 실시간 조회
        price = await self.client.get_current_price(symbol)
        
        if price > 0:
            current_time = datetime.now()
            old_price = self.price_cache.get(symbol, {}).get("price", 0)
            
            self.price_cache[symbol] = {
                "price": price,
                "timestamp": current_time.isoformat(),
                "change": price - old_price if old_price > 0 else 0,
                "change_percent": ((price - old_price) / old_price * 100) if old_price > 0 else 0
            }
            self.last_update[symbol] = current_time
        
        return price
    
    async def get_all_current_prices(self) -> Dict[str, Dict[str, Any]]:
        """모든 지원 암호화폐의 현재 가격 조회"""
        result = {}
        
        for crypto, symbol in self.supported_symbols.items():
            price_data = self.price_cache.get(symbol)
            if price_data and self._is_cache_valid(symbol):
                result[crypto] = price_data
            else:
                # 캐시가 없거나 만료된 경우 실시간 조회
                price = await self.get_current_price(symbol)
                if price > 0:
                    result[crypto] = self.price_cache[symbol]
        
        return result
    
    async def get_kline_data(self, symbol: str, interval: str = "1", limit: int = 200) -> List[Dict[str, Any]]:
        """캔들스틱 데이터 조회 (캐시 지원)"""
        cache_key = f"{symbol}_{interval}_{limit}"
        
        # 캐시 확인 (캔들 데이터는 5분간 캐시)
        if cache_key in self.kline_cache and self._is_kline_cache_valid(cache_key):
            return self.kline_cache[cache_key]["data"]
        
        # 실시간 조회
        raw_data = await self.client.get_kline_data(symbol, interval, limit)
        
        # 데이터 포맷팅
        formatted_data = []
        for kline in raw_data:
            try:
                formatted_data.append({
                    "timestamp": int(kline[0]),
                    "open": float(kline[1]),
                    "high": float(kline[2]),
                    "low": float(kline[3]),
                    "close": float(kline[4]),
                    "volume": float(kline[5])
                })
            except (ValueError, IndexError) as e:
                print(f"캔들 데이터 파싱 오류: {e}")
                continue
        
        # 캐시 저장
        self.kline_cache[cache_key] = {
            "data": formatted_data,
            "timestamp": datetime.now()
        }
        
        return formatted_data
    
    async def get_multiple_kline_data(self, symbols: List[str] = None, interval: str = "1", limit: int = 200) -> Dict[str, List[Dict[str, Any]]]:
        """여러 암호화폐의 캔들스틱 데이터 동시 조회"""
        if symbols is None:
            symbols = list(self.supported_symbols.values())
        
        result = {}
        for symbol in symbols:
            result[symbol] = await self.get_kline_data(symbol, interval, limit)
        
        return result
    
    def _is_cache_valid(self, symbol: str) -> bool:
        """가격 캐시 유효성 확인"""
        if symbol not in self.last_update:
            return False
        
        time_diff = datetime.now() - self.last_update[symbol]
        return time_diff.total_seconds() < self.cache_duration
    
    def _is_kline_cache_valid(self, cache_key: str) -> bool:
        """캔들 데이터 캐시 유효성 확인 (5분)"""
        if cache_key not in self.kline_cache:
            return False
        
        time_diff = datetime.now() - self.kline_cache[cache_key]["timestamp"]
        return time_diff.total_seconds() < 300  # 5분
    
    def get_supported_symbols(self) -> Dict[str, str]:
        """지원되는 암호화폐 심볼 목록 반환"""
        return self.supported_symbols.copy()
    
    def get_cache_status(self) -> Dict[str, Any]:
        """캐시 상태 정보 반환"""
        return {
            "price_cache_count": len(self.price_cache),
            "kline_cache_count": len(self.kline_cache),
            "last_updates": {symbol: update.isoformat() for symbol, update in self.last_update.items()},
            "is_running": self.is_running,
            "supported_symbols": self.supported_symbols
        }
    
    async def get_market_summary(self) -> Dict[str, Any]:
        """시장 요약 정보 반환"""
        prices = await self.get_all_current_prices()
        
        summary = {
            "timestamp": datetime.now().isoformat(),
            "total_symbols": len(self.supported_symbols),
            "active_feeds": len([p for p in prices.values() if p.get("price", 0) > 0]),
            "prices": prices
        }
        
        return summary