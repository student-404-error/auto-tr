# Regime Trend Strategy (EMA Regime + ATR Risk)

## 개요
- 전략 타입: `long-only trend following`
- 레짐 필터: `EMA(50) > EMA(200)` + 최소 격차 필터
- 진입: 강세 레짐에서 가격이 EMA fast 상단
- 청산: 레짐 이탈 또는 ATR 기반 트레일링 스탑 터치

## 환경변수 파라미터
- `TRADING_STRATEGY`: `regime_trend`(기본) 또는 `simple`
- `STRATEGY_SYMBOL`: 거래 심볼 (기본 `BTCUSDT`)
- `STRATEGY_INTERVAL`: 캔들 주기 (기본 `15`)
- `STRATEGY_LOOKBACK_BARS`: 조회 캔들 수 (기본 `260`)
- `STRATEGY_EMA_FAST`: 빠른 EMA 기간 (기본 `50`)
- `STRATEGY_EMA_SLOW`: 느린 EMA 기간 (기본 `200`)
- `STRATEGY_MIN_TREND_GAP_PCT`: `(EMA fast - EMA slow) / EMA slow` 최소값 (기본 `0.001`)
- `STRATEGY_ATR_PERIOD`: ATR 기간 (기본 `14`)
- `STRATEGY_INITIAL_STOP_ATR_MULT`: 초기 손절 ATR 배수 (기본 `2.5`)
- `STRATEGY_TRAILING_STOP_ATR_MULT`: 트레일링 ATR 배수 (기본 `3.0`)
- `STRATEGY_LOOP_SECONDS`: 전략 루프 주기 (기본 `60`)
- `STRATEGY_COOLDOWN_BARS`: 체결 후 재진입 대기 바 수 (기본 `2`)

## 백테스트 인터페이스
전략은 `backend/backtest/interface.py` 의 `StrategyBacktester` 인터페이스를 기준으로 구현되어 있습니다.

- 구현체: `backend/backtest/regime_trend_backtester.py`
- 입력 데이터프레임 컬럼: `timestamp`, `open`, `high`, `low`, `close`, `volume`

### 사용 예시
```python
import pandas as pd
from trading.strategy_params import RegimeTrendParams
from backtest.regime_trend_backtester import run_regime_trend_backtest

candles = pd.read_csv("data/btc_15m.csv")  # required columns: timestamp,open,high,low,close,volume
params = RegimeTrendParams(
    symbol="BTCUSDT",
    interval="15",
    ema_fast_period=50,
    ema_slow_period=200,
)
summary = run_regime_trend_backtest(candles, params, initial_cash=1000.0, fee_rate=0.0006)
print(summary)
```
