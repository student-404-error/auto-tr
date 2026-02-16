import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from .bybit_client import BybitClient
from .market_data_service import MarketDataService
from models.trade_tracker import TradeTracker

class MultiAssetTradingEngine:
    """다중 암호화폐 지원 트레이딩 엔진"""
    
    def __init__(self, client: BybitClient, market_service: MarketDataService, trade_tracker: TradeTracker):
        self.client = client
        self.market_service = market_service
        self.trade_tracker = trade_tracker
        self.is_active = False
        
        # 각 암호화폐별 포지션 및 상태 관리
        self.positions = {}  # {symbol: {'type': 'long'/'short'/None, 'amount': float}}
        self.last_signals = {}  # {symbol: 'buy'/'sell'/'hold'}
        
        # 암호화폐별 전략 파라미터
        self.strategy_params = {
            "BTCUSDT": {
                "rsi_period": 14,
                "rsi_oversold": 30,
                "rsi_overbought": 70,
                "ma_short": 20,
                "ma_long": 50,
                "price_change_threshold": 0.02,  # 2% 가격 변동 임계값
                "max_position_size": 30.0,  # 최대 포지션 크기 (USD)
                "min_order_size": 5.0       # 최소 주문 크기 (USD)
            },
            "XRPUSDT": {
                "rsi_period": 14,
                "rsi_oversold": 25,
                "rsi_overbought": 75,
                "ma_short": 15,
                "ma_long": 40,
                "price_change_threshold": 0.03,  # XRP는 더 높은 변동성
                "max_position_size": 25.0,
                "min_order_size": 5.0
            },
            "SOLUSDT": {
                "rsi_period": 14,
                "rsi_oversold": 25,
                "rsi_overbought": 75,
                "ma_short": 18,
                "ma_long": 45,
                "price_change_threshold": 0.025,  # SOL 중간 변동성
                "max_position_size": 25.0,
                "min_order_size": 5.0
            }
        }
        
        # 포트폴리오 관리 설정
        self.portfolio_config = {
            "max_total_exposure": 80.0,  # 전체 포트폴리오 최대 노출 (USD)
            "max_single_asset_weight": 0.4,  # 단일 자산 최대 비중 (40%)
            "rebalance_threshold": 0.1,  # 리밸런싱 임계값 (10%)
            "risk_per_trade": 0.02  # 거래당 리스크 (2%)
        }
        
        print("🤖 MultiAssetTradingEngine 초기화 완료")
        print(f"   지원 암호화폐: {list(self.strategy_params.keys())}")
    
    async def start_trading(self):
        """다중 자산 자동매매 시작"""
        self.is_active = True
        print("🚀 다중 자산 자동매매 시작")
        
        # 시장 데이터 서비스 시작
        asyncio.create_task(self.market_service.start_price_feeds())
        
        while self.is_active:
            try:
                await self._execute_multi_asset_strategy()
                await asyncio.sleep(60)  # 1분마다 실행
            except Exception as e:
                print(f"다중 자산 전략 실행 오류: {e}")
                await asyncio.sleep(60)
    
    def stop_trading(self):
        """자동매매 중지"""
        self.is_active = False
        self.market_service.stop_price_feeds()
        print("🛑 다중 자산 자동매매 중지")
    
    async def _execute_multi_asset_strategy(self):
        """다중 자산 전략 실행"""
        try:
            # 1. 포트폴리오 상태 확인
            portfolio_status = await self._get_portfolio_status()
            
            # 2. 각 암호화폐별 분석 및 신호 생성
            signals = {}
            for symbol in self.strategy_params.keys():
                signal = await self._analyze_asset(symbol, portfolio_status)
                if signal:
                    signals[symbol] = signal
            
            # 3. 포트폴리오 레벨 리스크 관리
            filtered_signals = await self._apply_portfolio_risk_management(signals, portfolio_status)
            
            # 4. 신호 실행
            for symbol, signal in filtered_signals.items():
                await self._execute_signal(symbol, signal)
                
        except Exception as e:
            print(f"다중 자산 전략 실행 오류: {e}")
    
    async def _analyze_asset(self, symbol: str, portfolio_status: Dict[str, Any]) -> Optional[str]:
        """개별 자산 분석 및 신호 생성"""
        try:
            # 캔들 데이터 조회
            kline_data = await self.market_service.get_kline_data(symbol, limit=100)
            if len(kline_data) < 10:
                return None
            
            # 현재 가격
            current_price = await self.market_service.get_current_price(symbol)
            if current_price <= 0:
                return None
            
            # 전략 파라미터
            params = self.strategy_params[symbol]
            
            # 간단한 이동평균 기반 분석
            recent_prices = [kline["close"] for kline in kline_data[-10:]]
            short_ma = sum(recent_prices[-params["ma_short"]:]) / len(recent_prices[-params["ma_short"]:]) if len(recent_prices) >= params["ma_short"] else current_price
            long_ma = sum(recent_prices) / len(recent_prices)
            
            # 현재 포지션 확인
            current_position = self.positions.get(symbol, {}).get("type")
            last_signal = self.last_signals.get(symbol)
            
            print(f"📊 {symbol} 분석: 현재가=${current_price:.4f}, 단기MA=${short_ma:.4f}, 장기MA=${long_ma:.4f}")
            
            # 매수 신호: 단기 이동평균이 장기 이동평균보다 높고, 현재가가 단기 이동평균보다 낮을 때
            if (short_ma > long_ma * (1 + params["price_change_threshold"]) and 
                current_price < short_ma * 0.98 and 
                current_position != 'long'):
                print(f"🟢 {symbol} Buy signal!")
                return 'buy'
            
            # 매도 신호: 현재가가 단기 이동평균보다 높고 포지션이 있을 때
            elif (current_price > short_ma * (1 + params["price_change_threshold"]) and 
                  current_position == 'long'):
                print(f"🔴 {symbol} Sell signal!")
                return 'sell'
            
            # 보류 신호
            else:
                print(f"🟡 {symbol} Hold signal")
                return 'hold'
                
        except Exception as e:
            print(f"{symbol} 분석 오류: {e}")
            return None
    
    async def _get_portfolio_status(self) -> Dict[str, Any]:
        """포트폴리오 현재 상태 조회"""
        try:
            # 잔고 조회
            balance = await self.client.get_balance()
            usdt_balance = balance.get("USDT", {}).get("available", 0)
            
            # 각 암호화폐별 포지션 값 계산
            total_portfolio_value = usdt_balance
            asset_values = {}
            
            for symbol in self.strategy_params.keys():
                base_currency = symbol.replace("USDT", "")
                crypto_balance = balance.get(base_currency, {}).get("available", 0)
                
                if crypto_balance > 0:
                    current_price = await self.market_service.get_current_price(symbol)
                    asset_value = crypto_balance * current_price
                    asset_values[symbol] = {
                        "quantity": crypto_balance,
                        "value": asset_value,
                        "price": current_price
                    }
                    total_portfolio_value += asset_value
                else:
                    asset_values[symbol] = {
                        "quantity": 0,
                        "value": 0,
                        "price": await self.market_service.get_current_price(symbol)
                    }
            
            return {
                "total_value": total_portfolio_value,
                "usdt_balance": usdt_balance,
                "asset_values": asset_values,
                "max_total_exposure": self.portfolio_config["max_total_exposure"]
            }
            
        except Exception as e:
            print(f"포트폴리오 상태 조회 오류: {e}")
            return {"total_value": 0, "usdt_balance": 0, "asset_values": {}}
    
    async def _apply_portfolio_risk_management(self, signals: Dict[str, str], portfolio_status: Dict[str, Any]) -> Dict[str, str]:
        """포트폴리오 레벨 리스크 관리"""
        filtered_signals = {}
        
        try:
            total_exposure = sum([asset["value"] for asset in portfolio_status["asset_values"].values()])
            max_exposure = portfolio_status["max_total_exposure"]
            
            for symbol, signal in signals.items():
                if signal == 'buy':
                    # 매수 신호 리스크 체크
                    params = self.strategy_params[symbol]
                    proposed_order_size = min(params["max_position_size"], portfolio_status["usdt_balance"] * 0.3)
                    
                    # 전체 노출 한도 체크
                    if total_exposure + proposed_order_size <= max_exposure:
                        # 단일 자산 비중 체크
                        current_asset_value = portfolio_status["asset_values"][symbol]["value"]
                        new_asset_weight = (current_asset_value + proposed_order_size) / (portfolio_status["total_value"] + proposed_order_size)
                        
                        if new_asset_weight <= self.portfolio_config["max_single_asset_weight"]:
                            filtered_signals[symbol] = signal
                            total_exposure += proposed_order_size
                        else:
                            print(f"❌ {symbol} 매수 거부: 단일 자산 비중 초과 ({new_asset_weight:.2%})")
                    else:
                        print(f"❌ {symbol} 매수 거부: 전체 노출 한도 초과")
                
                elif signal in ['sell', 'hold']:
                    # 매도 및 보류 신호는 항상 허용
                    filtered_signals[symbol] = signal
            
            return filtered_signals
            
        except Exception as e:
            print(f"리스크 관리 오류: {e}")
            return signals
    
    async def _execute_signal(self, symbol: str, signal: str):
        """신호 실행"""
        try:
            current_price = await self.market_service.get_current_price(symbol)
            
            # 신호 기록 (모든 신호)
            await self._record_signal(symbol, signal, current_price)
            
            # 실제 거래 실행 (buy/sell만)
            if signal in ['buy', 'sell'] and signal != self.last_signals.get(symbol):
                await self._execute_trade(symbol, signal, current_price)
            
            self.last_signals[symbol] = signal
            
        except Exception as e:
            print(f"{symbol} 신호 실행 오류: {e}")
    
    async def _record_signal(self, symbol: str, signal: str, current_price: float):
        """신호 기록"""
        try:
            if signal == 'hold':
                self.trade_tracker.add_trade(
                    symbol,
                    "Hold",
                    0.0,
                    current_price,
                    signal="hold"
                )
                print(f"🟡 {symbol} 보류 신호 기록: ${current_price:.4f}")
        except Exception as e:
            print(f"{symbol} 신호 기록 오류: {e}")
    
    async def _execute_trade(self, symbol: str, signal: str, current_price: float):
        """실제 거래 실행"""
        try:
            if signal == "buy":
                # 안전한 매수 수량 계산
                safe_qty = await self.client.calculate_safe_order_size(symbol, "Buy")
                if not safe_qty:
                    print(f"❌ {symbol} 안전한 매수 수량을 계산할 수 없습니다")
                    return
                
                result = await self.client.place_order(
                    symbol=symbol,
                    side="Buy",
                    qty=safe_qty
                )
                
                if result.get("success"):
                    self.positions[symbol] = {"type": "long", "amount": safe_qty}
                    self.trade_tracker.add_trade(
                        symbol,
                        "Buy",
                        float(safe_qty),
                        current_price,
                        signal="buy"
                    )
                    order_value = float(safe_qty) * current_price
                    print(f"🟢 {symbol} 매수 주문 실행: {safe_qty} (${order_value:.2f})")
                else:
                    print(f"❌ {symbol} 매수 주문 실패: {result.get('error', '알 수 없는 오류')}")
            
            elif signal == "sell" and self.positions.get(symbol, {}).get("type") == "long":
                # 보유 중인 암호화폐 전량 매도
                result = await self.client.place_order(
                    symbol=symbol,
                    side="Sell",
                    qty=None  # 자동으로 보유량 계산
                )
                
                if result.get("success"):
                    sold_qty = self.positions[symbol].get("amount", "0")
                    self.positions[symbol] = {"type": None, "amount": 0}
                    self.trade_tracker.add_trade(
                        symbol,
                        "Sell",
                        float(sold_qty),
                        current_price,
                        signal="sell"
                    )
                    order_value = float(sold_qty) * current_price
                    print(f"🔴 {symbol} 매도 주문 실행: {sold_qty} (${order_value:.2f})")
                else:
                    print(f"❌ {symbol} 매도 주문 실패: {result.get('error', '알 수 없는 오류')}")
                    
        except Exception as e:
            print(f"{symbol} 거래 실행 오류: {e}")
    
    def get_strategy_status(self) -> Dict[str, Any]:
        """전략 상태 반환"""
        return {
            "is_active": self.is_active,
            "positions": self.positions,
            "last_signals": self.last_signals,
            "supported_symbols": list(self.strategy_params.keys()),
            "strategy_params": self.strategy_params,
            "portfolio_config": self.portfolio_config
        }
    
    async def get_portfolio_summary(self) -> Dict[str, Any]:
        """포트폴리오 요약 정보"""
        try:
            portfolio_status = await self._get_portfolio_status()
            market_summary = await self.market_service.get_market_summary()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "portfolio": portfolio_status,
                "market_data": market_summary,
                "strategy_status": self.get_strategy_status()
            }
        except Exception as e:
            print(f"포트폴리오 요약 조회 오류: {e}")
            return {}
    
    def update_strategy_params(self, symbol: str, params: Dict[str, Any]):
        """전략 파라미터 업데이트"""
        if symbol in self.strategy_params:
            self.strategy_params[symbol].update(params)
            print(f"📊 {symbol} 전략 파라미터 업데이트 완료")
        else:
            print(f"❌ 지원되지 않는 심볼: {symbol}")