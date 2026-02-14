from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List

import pandas as pd


@dataclass
class BacktestTrade:
    timestamp: int
    side: str
    price: float
    quantity: float
    reason: str


@dataclass
class BacktestResult:
    initial_cash: float
    final_equity: float
    return_pct: float
    max_drawdown_pct: float
    win_rate_pct: float
    trades: List[BacktestTrade] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)


class StrategyBacktester(ABC):
    @abstractmethod
    def run(self, candles: pd.DataFrame) -> BacktestResult:
        """Run strategy backtest on OHLCV candles and return summary metrics."""
        raise NotImplementedError

