from typing import List, Dict, Any

import pandas as pd

from backtest.interface import BacktestResult, BacktestTrade, StrategyBacktester
from trading.regime_trend_strategy import RegimeTrendSignalEngine
from trading.strategy_params import RegimeTrendParams


class RegimeTrendBacktester(StrategyBacktester):
    """Long-only backtester for RegimeTrendSignalEngine."""

    def __init__(
        self,
        params: RegimeTrendParams,
        initial_cash: float = 1000.0,
        fee_rate: float = 0.0006,
    ):
        self.params = params
        self.initial_cash = initial_cash
        self.fee_rate = fee_rate
        self.engine = RegimeTrendSignalEngine(params)

    def run(self, candles: pd.DataFrame) -> BacktestResult:
        frame = self.engine.build_indicator_frame(candles)
        if frame.empty:
            return BacktestResult(
                initial_cash=self.initial_cash,
                final_equity=self.initial_cash,
                return_pct=0.0,
                max_drawdown_pct=0.0,
                win_rate_pct=0.0,
                trades=[],
                meta={"reason": "insufficient_data"},
            )

        cash = self.initial_cash
        qty = 0.0
        in_position = False
        trailing_stop = None
        bars_since_trade = self.params.cooldown_bars
        trades: List[BacktestTrade] = []
        sell_pnls: List[float] = []
        equity_curve: List[float] = []

        for idx in range(len(frame)):
            window = frame.iloc[: idx + 1]
            last = window.iloc[-1]
            close = float(last["close"])
            ts = int(last["timestamp"])

            decision = self.engine.decide(window, in_position, trailing_stop, bars_since_trade)
            trailing_stop = decision.trailing_stop

            if decision.signal == "buy" and not in_position and cash > 0:
                fee = cash * self.fee_rate
                deploy = cash - fee
                if deploy > 0:
                    qty = deploy / close
                    cash = 0.0
                    in_position = True
                    bars_since_trade = 0
                    trades.append(
                        BacktestTrade(
                            timestamp=ts,
                            side="Buy",
                            price=close,
                            quantity=qty,
                            reason=decision.reason,
                        )
                    )
            elif decision.signal == "sell" and in_position and qty > 0:
                gross = qty * close
                fee = gross * self.fee_rate
                net = gross - fee
                entry_price = trades[-1].price if trades else close
                sell_pnls.append((close - entry_price) / entry_price)
                cash = net
                qty = 0.0
                in_position = False
                trailing_stop = None
                bars_since_trade = 0
                trades.append(
                    BacktestTrade(
                        timestamp=ts,
                        side="Sell",
                        price=close,
                        quantity=0.0,
                        reason=decision.reason,
                    )
                )
            else:
                bars_since_trade += 1

            equity = cash + (qty * close if in_position else 0.0)
            equity_curve.append(equity)

        final_equity = equity_curve[-1] if equity_curve else self.initial_cash
        return_pct = ((final_equity / self.initial_cash) - 1.0) * 100.0
        max_drawdown_pct = self._max_drawdown_pct(equity_curve)
        win_rate_pct = (
            (sum(1 for p in sell_pnls if p > 0) / len(sell_pnls)) * 100.0 if sell_pnls else 0.0
        )

        return BacktestResult(
            initial_cash=self.initial_cash,
            final_equity=final_equity,
            return_pct=return_pct,
            max_drawdown_pct=max_drawdown_pct,
            win_rate_pct=win_rate_pct,
            trades=trades,
            meta={
                "closed_trades": len(sell_pnls),
                "fee_rate": self.fee_rate,
                "params": self.params.to_dict(),
            },
        )

    @staticmethod
    def _max_drawdown_pct(curve: List[float]) -> float:
        if not curve:
            return 0.0
        peak = curve[0]
        max_dd = 0.0
        for value in curve:
            if value > peak:
                peak = value
            dd = (peak - value) / peak if peak > 0 else 0.0
            if dd > max_dd:
                max_dd = dd
        return max_dd * 100.0


def run_regime_trend_backtest(
    candles: pd.DataFrame,
    params: RegimeTrendParams,
    initial_cash: float = 1000.0,
    fee_rate: float = 0.0006,
) -> Dict[str, Any]:
    runner = RegimeTrendBacktester(
        params=params,
        initial_cash=initial_cash,
        fee_rate=fee_rate,
    )
    result = runner.run(candles)
    return {
        "initial_cash": result.initial_cash,
        "final_equity": result.final_equity,
        "return_pct": result.return_pct,
        "max_drawdown_pct": result.max_drawdown_pct,
        "win_rate_pct": result.win_rate_pct,
        "trade_count": len(result.trades),
        "meta": result.meta,
    }

