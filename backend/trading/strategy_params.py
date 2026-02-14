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
