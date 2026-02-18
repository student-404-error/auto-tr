from dataclasses import dataclass, asdict
from typing import Dict, Any


@dataclass
class RegimeTrendParams:
    # Market config
    symbol: str = "BTCUSDT"
    interval: str = "15"
    lookback_bars: int = 260

    # Trend regime filter
    ema_fast_period: int = 50
    ema_slow_period: int = 200
    min_trend_gap_pct: float = 0.001

    # Risk and exits
    atr_period: int = 14
    initial_stop_atr_mult: float = 2.5
    trailing_stop_atr_mult: float = 3.0

    # Execution controls
    loop_seconds: int = 60
    cooldown_bars: int = 2

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def regime_trend_param_descriptions() -> Dict[str, str]:
    return {
        "symbol": "Bybit symbol to trade (spot).",
        "interval": "Kline interval string used by Bybit API (e.g. 1, 5, 15, 60).",
        "lookback_bars": "Number of candles fetched per strategy cycle.",
        "ema_fast_period": "Fast EMA period used for trend tracking.",
        "ema_slow_period": "Slow EMA period used as regime filter.",
        "min_trend_gap_pct": "Minimum normalized gap (EMA fast - EMA slow) / EMA slow to accept bullish regime.",
        "atr_period": "ATR period for volatility-aware stop logic.",
        "initial_stop_atr_mult": "Initial stop distance at entry: ATR * multiplier.",
        "trailing_stop_atr_mult": "Trailing stop distance while holding a long position: ATR * multiplier.",
        "loop_seconds": "Polling interval for live execution loop.",
        "cooldown_bars": "Minimum bars to wait after a trade before next entry.",
    }


@dataclass
class BreakoutVolumeParams:
    symbol: str = "BTCUSDT"
    interval: str = "15"
    lookback_bars: int = 260

    # Breakout config
    breakout_period: int = 20          # 고점 돌파 기준 봉 수
    volume_ma_period: int = 20         # 거래량 이동평균 기간
    volume_multiplier: float = 1.5     # 거래량 급증 배수 (평균 대비)
    atr_period: int = 14

    # Risk
    initial_stop_atr_mult: float = 2.0
    trailing_stop_atr_mult: float = 2.5
    loop_seconds: int = 60
    cooldown_bars: int = 3

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def breakout_volume_param_descriptions() -> Dict[str, str]:
    return {
        "symbol": "Bybit symbol to trade (spot).",
        "interval": "Kline interval (e.g. 1, 5, 15, 60).",
        "lookback_bars": "Number of candles fetched per cycle.",
        "breakout_period": "Lookback bars for detecting prior high breakout.",
        "volume_ma_period": "Period for volume moving average.",
        "volume_multiplier": "Volume must exceed MA * this multiplier to confirm breakout.",
        "atr_period": "ATR period for stop calculation.",
        "initial_stop_atr_mult": "Initial stop: close - ATR * multiplier.",
        "trailing_stop_atr_mult": "Trailing stop: close - ATR * multiplier.",
        "loop_seconds": "Polling interval in seconds.",
        "cooldown_bars": "Bars to wait after a trade before next entry.",
    }


@dataclass
class MeanReversionParams:
    symbol: str = "BTCUSDT"
    interval: str = "15"
    lookback_bars: int = 260

    # Bollinger Bands
    bb_period: int = 20
    bb_std: float = 2.0

    # RSI
    rsi_period: int = 14
    rsi_oversold: float = 30.0
    rsi_overbought: float = 65.0

    # Risk
    atr_period: int = 14
    stop_atr_mult: float = 1.5
    loop_seconds: int = 60
    cooldown_bars: int = 2

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def mean_reversion_param_descriptions() -> Dict[str, str]:
    return {
        "symbol": "Bybit symbol to trade (spot).",
        "interval": "Kline interval (e.g. 1, 5, 15, 60).",
        "lookback_bars": "Number of candles fetched per cycle.",
        "bb_period": "Bollinger Bands period.",
        "bb_std": "Bollinger Bands standard deviation multiplier.",
        "rsi_period": "RSI calculation period.",
        "rsi_oversold": "RSI threshold to trigger buy (oversold).",
        "rsi_overbought": "RSI threshold to trigger sell (overbought).",
        "atr_period": "ATR period for stop calculation.",
        "stop_atr_mult": "Stop distance: close - ATR * multiplier.",
        "loop_seconds": "Polling interval in seconds.",
        "cooldown_bars": "Bars to wait after a trade before next entry.",
    }


@dataclass
class DualTimeframeParams:
    symbol: str = "BTCUSDT"

    # Higher timeframe (trend direction)
    htf_interval: str = "60"
    htf_ema_fast: int = 20
    htf_ema_slow: int = 50

    # Lower timeframe (entry timing)
    ltf_interval: str = "15"
    ltf_lookback_bars: int = 260
    ltf_rsi_period: int = 14
    ltf_rsi_oversold: float = 40.0
    ltf_ema_period: int = 20

    # Risk
    atr_period: int = 14
    initial_stop_atr_mult: float = 2.0
    trailing_stop_atr_mult: float = 2.5
    loop_seconds: int = 60
    cooldown_bars: int = 2

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def dual_timeframe_param_descriptions() -> Dict[str, str]:
    return {
        "symbol": "Bybit symbol to trade (spot).",
        "htf_interval": "Higher timeframe interval (e.g. 60 = 1H).",
        "htf_ema_fast": "Fast EMA period on higher timeframe for trend direction.",
        "htf_ema_slow": "Slow EMA period on higher timeframe for trend direction.",
        "ltf_interval": "Lower timeframe interval for entry timing.",
        "ltf_lookback_bars": "Number of candles fetched on lower timeframe.",
        "ltf_rsi_period": "RSI period on lower timeframe.",
        "ltf_rsi_oversold": "RSI oversold threshold on lower timeframe for entry.",
        "ltf_ema_period": "EMA period on lower timeframe for entry confirmation.",
        "atr_period": "ATR period for stop calculation.",
        "initial_stop_atr_mult": "Initial stop: close - ATR * multiplier.",
        "trailing_stop_atr_mult": "Trailing stop: close - ATR * multiplier.",
        "loop_seconds": "Polling interval in seconds.",
        "cooldown_bars": "Bars to wait after a trade before next entry.",
    }
