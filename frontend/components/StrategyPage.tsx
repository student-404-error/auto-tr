'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { tradingApi } from '@/utils/api'
import { isAuthenticated, restoreAuthHeader } from '@/utils/auth'

function getErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return e.response?.data?.detail || e.message
  }
  return e instanceof Error ? e.message : 'Unknown error'
}

interface StrategyStatus {
  strategy?: string
  is_active: boolean
  position: string | null
  last_signal: string | null
  trade_amount: string
  trailing_stop?: number | null
  bars_since_trade?: number
  parameters?: Record<string, any>
  parameter_descriptions?: Record<string, string>
}

interface PerformanceData {
  daily_change_percent: number
  weekly_change_percent: number
  monthly_change_percent: number
}

interface PositionSummary {
  open_positions_count?: number
  closed_positions_count?: number
  total_unrealized_pnl?: number
  realized_pnl?: number
  statistics?: {
    total_positions?: number
    winning_positions?: number
    losing_positions?: number
    win_rate?: number
    total_realized_pnl?: number
    best_trade?: number
    worst_trade?: number
  }
}

interface LatestTrade {
  timestamp: string
  side: string
  symbol: string
  price: number
  qty: number
}

const PARAM_ICONS: Record<string, string> = {
  symbol: 'currency_bitcoin',
  interval: 'schedule',
  lookback_bars: 'history',
  ema_fast_period: 'speed',
  ema_slow_period: 'slow_motion_video',
  min_trend_gap_pct: 'functions',
  atr_period: 'show_chart',
  initial_stop_atr_mult: 'security',
  trailing_stop_atr_mult: 'trending_down',
  loop_seconds: 'timer',
  cooldown_bars: 'hourglass_bottom',
  rsi_period: 'analytics',
  rsi_oversold: 'arrow_downward',
  rsi_overbought: 'arrow_upward',
  ma_short: 'speed',
  ma_long: 'slow_motion_video',
  breakout_period: 'bar_chart',
  volume_ma_period: 'stacked_bar_chart',
  volume_multiplier: 'trending_up',
  stop_atr_mult: 'security',
  bb_period: 'candlestick_chart',
  bb_std: 'functions',
  htf_interval: 'schedule',
  htf_ema_fast: 'speed',
  htf_ema_slow: 'slow_motion_video',
  ltf_interval: 'schedule',
  ltf_lookback_bars: 'history',
  ltf_rsi_period: 'analytics',
  ltf_rsi_oversold: 'arrow_downward',
  ltf_ema_period: 'show_chart',
}

const PARAM_LABELS: Record<string, string> = {
  symbol: 'Symbol',
  interval: 'Interval',
  lookback_bars: 'Lookback Period',
  ema_fast_period: 'EMA Fast Period',
  ema_slow_period: 'EMA Slow Period',
  min_trend_gap_pct: 'Min Trend Gap %',
  atr_period: 'ATR Period',
  initial_stop_atr_mult: 'Initial Stop (ATR x)',
  trailing_stop_atr_mult: 'Trailing Stop (ATR x)',
  loop_seconds: 'Loop Interval (s)',
  cooldown_bars: 'Cooldown Bars',
  rsi_period: 'RSI Period',
  rsi_oversold: 'RSI Oversold',
  rsi_overbought: 'RSI Overbought',
  ma_short: 'MA Short',
  ma_long: 'MA Long',
  breakout_period: 'Breakout Period',
  volume_ma_period: 'Volume MA Period',
  volume_multiplier: 'Volume Multiplier',
  stop_atr_mult: 'Stop (ATR x)',
  bb_period: 'BB Period',
  bb_std: 'BB Std Dev',
  htf_interval: 'HTF Interval',
  htf_ema_fast: 'HTF EMA Fast',
  htf_ema_slow: 'HTF EMA Slow',
  ltf_interval: 'LTF Interval',
  ltf_lookback_bars: 'LTF Lookback',
  ltf_rsi_period: 'LTF RSI Period',
  ltf_rsi_oversold: 'LTF RSI Oversold',
  ltf_ema_period: 'LTF EMA Period',
}

interface StrategyMeta {
  name: string
  description: string
  icon: string
  badge: string
}

const STRATEGY_META: Record<string, StrategyMeta> = {
  regime_trend: {
    name: 'Regime Trend Engine',
    description: 'Dual EMA regime filter with ATR trailing stop. Enters when fast EMA is above slow EMA by a minimum gap. Best in trending markets.',
    icon: 'trending_up',
    badge: 'Trend',
  },
  breakout_volume: {
    name: 'Breakout + Volume',
    description: 'Enters on prior-high breakout confirmed by volume surge. Reduces false breakouts by requiring volume × multiplier above MA.',
    icon: 'bar_chart',
    badge: 'Breakout',
  },
  mean_reversion: {
    name: 'Mean Reversion',
    description: 'Buys when RSI is oversold and price is below Bollinger lower band. Exits at BB midline or RSI overbought. Best in ranging markets.',
    icon: 'compare_arrows',
    badge: 'Reversion',
  },
  dual_timeframe: {
    name: 'Dual Timeframe',
    description: 'Uses 1H trend direction + 15M pullback entry timing. Filters noise with multi-TF confluence.',
    icon: 'layers',
    badge: 'Multi-TF',
  },
}

const SUPPORTED_SYMBOLS = ['BTCUSDT', 'XRPUSDT', 'SOLUSDT']

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return timestamp
  }
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatParamValue(key: string, value: any): string {
  if (typeof value === 'number') {
    if (key.includes('pct') || key.includes('percent')) return `${(value * 100).toFixed(2)}%`
    if (key.includes('mult')) return `${value}x`
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(3)
  }
  return String(value)
}

function isHighlightParam(key: string): boolean {
  const highlights = [
    'ema_fast_period', 'ema_slow_period', 'min_trend_gap_pct',
    'atr_period', 'initial_stop_atr_mult', 'trailing_stop_atr_mult',
    'rsi_period', 'rsi_oversold', 'rsi_overbought', 'ma_short', 'ma_long',
  ]
  return highlights.includes(key)
}

export default function StrategyPage() {
  const router = useRouter()
  const [status, setStatus] = useState<StrategyStatus | null>(null)
  const [performance, setPerformance] = useState<PerformanceData | null>(null)
  const [summary, setSummary] = useState<PositionSummary | null>(null)
  const [latestTrade, setLatestTrade] = useState<LatestTrade | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingParams, setIsSavingParams] = useState(false)
  const [isChangingStrategy, setIsChangingStrategy] = useState(false)
  const [isChangingSymbol, setIsChangingSymbol] = useState(false)
  const [paramsDraft, setParamsDraft] = useState<Record<string, string | number | boolean>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [availableStrategies, setAvailableStrategies] = useState<Record<string, StrategyMeta>>({})
  const [showStrategySelector, setShowStrategySelector] = useState(false)

  // Auth guard: redirect to /auth if not authenticated
  useEffect(() => {
    restoreAuthHeader()
    if (!isAuthenticated()) {
      router.replace('/auth')
      return
    }
    setAuthChecked(true)
  }, [router])

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, perfRes, summaryRes, tradesRes, strategiesRes] = await Promise.allSettled([
        tradingApi.getTradingStatus(),
        tradingApi.getPortfolioPerformance(),
        tradingApi.getPositionsSummary(),
        tradingApi.getTradeHistory(),
        tradingApi.getStrategies(),
      ])

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value)
        setParamsDraft(statusRes.value.parameters || {})
      }
      if (perfRes.status === 'fulfilled') setPerformance(perfRes.value)
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value)
      if (tradesRes.status === 'fulfilled') {
        const trades = tradesRes.value.trades || []
        if (trades.length > 0) {
          const t = trades[0]
          setLatestTrade({
            timestamp: t.ts || t.timestamp || '',
            side: t.side || '',
            symbol: t.symbol || '',
            price: Number(t.price || 0),
            qty: Number(t.quantity || t.qty || 0),
          })
        }
      }
      if (strategiesRes.status === 'fulfilled') {
        // 서버 데이터와 로컬 메타를 병합
        const serverAvailable = strategiesRes.value.available || {}
        const merged: Record<string, StrategyMeta> = {}
        Object.keys(serverAvailable).forEach((key) => {
          merged[key] = STRATEGY_META[key] || {
            name: serverAvailable[key].name || key,
            description: serverAvailable[key].description || '',
            icon: 'smart_toy',
            badge: key,
          }
        })
        setAvailableStrategies(merged)
      }
    } catch {
      // keep existing data
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authChecked) return
    fetchAll()
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [fetchAll, authChecked])

  if (!authChecked || isLoading) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center bg-background-dark">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const isActive = status?.is_active || false
  const strategyKey = status?.strategy || 'regime_trend'
  const currentMeta = STRATEGY_META[strategyKey] || { name: strategyKey, description: 'Automated trading strategy.', icon: 'smart_toy', badge: strategyKey }
  const strategyName = currentMeta.name
  const description = currentMeta.description
  const params = status?.parameters || {}
  const paramDescs = status?.parameter_descriptions || {}
  const currentSymbol = String(params.symbol || 'BTCUSDT').toUpperCase()

  const totalReturn = performance?.monthly_change_percent || 0
  const totalReturnPositive = totalReturn >= 0
  const winRate = summary?.statistics?.win_rate || 0
  const totalTrades = summary?.statistics?.total_positions || 0
  const maxDD = 0

  const handleStart = async () => {
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await tradingApi.startTrading()
      await fetchAll()
      setStatus((prev) => (prev ? { ...prev, is_active: true } : prev))
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || 'Failed to start trading')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStop = async () => {
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await tradingApi.stopTrading()
      await fetchAll()
      setStatus((prev) => (prev ? { ...prev, is_active: false } : prev))
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || 'Failed to stop trading')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeStrategy = async (strategyKey: string) => {
    if (isActive) return
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsChangingStrategy(true)
    try {
      await tradingApi.changeStrategy(strategyKey)
      await fetchAll()
      setShowStrategySelector(false)
      setSuccessMsg(`Strategy changed to ${STRATEGY_META[strategyKey]?.name || strategyKey}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || 'Failed to change strategy')
    } finally {
      setIsChangingStrategy(false)
    }
  }

  const handleChangeSymbol = async (nextSymbol: string) => {
    if (!nextSymbol || nextSymbol === currentSymbol || isChangingSymbol) return
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsChangingSymbol(true)
    try {
      await tradingApi.changeSymbol(nextSymbol)
      await fetchAll()
      setSuccessMsg(`Symbol changed to ${nextSymbol}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || 'Failed to change symbol')
    } finally {
      setIsChangingSymbol(false)
    }
  }

  const handleParamChange = (key: string, rawValue: string) => {
    const current = params[key]
    let next: string | number = rawValue
    if (typeof current === 'number') {
      next = rawValue === '' ? '' : Number(rawValue)
    }
    setParamsDraft((prev) => ({ ...prev, [key]: next }))
  }

  const handleSaveParams = async () => {
    setErrorMsg(null)
    setIsSavingParams(true)
    try {
      await tradingApi.updateTradingParams(paramsDraft)
      await fetchAll()
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || 'Failed to save parameters')
    } finally {
      setIsSavingParams(false)
    }
  }

  return (
    <div className="w-full h-screen bg-background-dark text-slate-200 font-display flex flex-col antialiased overflow-hidden">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-40 bg-background-dark/90 backdrop-blur-sm border-b border-white/5">
        <button
          onClick={() => router.push('/')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-highlight text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-icons-round">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-bold tracking-tight">Strategy Control</h1>
          <span className="text-xs text-primary font-medium tracking-wide uppercase opacity-80">
            {strategyKey.toUpperCase()}
          </span>
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 px-5 pb-32 overflow-y-auto space-y-6 max-w-2xl mx-auto w-full">
        {/* Title & Status Badge */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">{strategyName}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {params.symbol || 'BTCUSDT'} &bull; {params.interval || '15'}m interval
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isActive ? 'bg-success/10 border border-success/20' : 'bg-danger/10 border border-danger/20'}`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-danger'}`}></span>
            <span className={`text-xs font-bold tracking-wider uppercase ${isActive ? 'text-success' : 'text-danger'}`}>
              {isActive ? 'Live' : 'Stopped'}
            </span>
          </div>
        </div>

        {/* Performance Summary Card */}
        <div className="glass-panel rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Performance Metrics</h3>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Monthly Return</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${totalReturnPositive ? 'text-success' : 'text-danger'}`}>
                  {totalReturnPositive ? '+' : ''}{totalReturn.toFixed(1)}%
                </span>
                <span className={`material-icons-round text-sm ${totalReturnPositive ? 'text-success' : 'text-danger'}`}>
                  {totalReturnPositive ? 'trending_up' : 'trending_down'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Win Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary text-glow">
                  {winRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Max DD</p>
              <span className="text-sm font-semibold text-danger">
                {maxDD !== 0 ? `-${Math.abs(maxDD).toFixed(1)}%` : '-'}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Position</p>
              <span className="text-sm font-semibold text-white">
                {status?.position || 'None'}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Trades</p>
              <span className="text-sm font-semibold text-white">
                {totalTrades.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-success/50 to-transparent opacity-50"></div>
        </div>

        {errorMsg && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="material-icons-round text-base">check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Strategy Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-300">Trading Symbol</h3>
            {isActive && <span className="text-xs text-slate-500">Stop trading first</span>}
          </div>
          <div className="glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-background-dark flex items-center justify-center text-slate-400">
              <span className="material-icons-round text-lg">currency_bitcoin</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1">Current market</p>
              <select
                value={currentSymbol}
                onChange={(e) => handleChangeSymbol(e.target.value)}
                disabled={isChangingSymbol}
                className="w-full bg-surface-highlight border border-white/10 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-primary disabled:opacity-60"
              >
                {SUPPORTED_SYMBOLS.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>
            {isChangingSymbol && <div className="w-5 h-5 border border-primary border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-300">Active Strategy</h3>
            {!isActive && (
              <button
                onClick={() => setShowStrategySelector((v) => !v)}
                className="text-xs text-primary font-semibold flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                <span className="material-icons-round text-sm">{showStrategySelector ? 'expand_less' : 'swap_horiz'}</span>
                {showStrategySelector ? 'Cancel' : 'Change'}
              </button>
            )}
            {isActive && (
              <span className="text-xs text-slate-500">Stop trading to change strategy</span>
            )}
          </div>

          {/* Current strategy card */}
          <div className="glass-panel rounded-xl p-4 border border-primary/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-icons-round text-xl">{currentMeta.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{strategyName}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wide">
                  {currentMeta.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{description}</p>
            </div>
            <span className="material-icons-round text-primary text-xl">check_circle</span>
          </div>

          {/* Strategy picker (shown when not active and toggled) */}
          {showStrategySelector && !isActive && (
            <div className="bg-surface rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {Object.entries(availableStrategies).map(([key, meta]) => {
                const isCurrent = key === strategyKey
                return (
                  <button
                    key={key}
                    onClick={() => !isCurrent && handleChangeStrategy(key)}
                    disabled={isCurrent || isChangingStrategy}
                    className={`w-full p-4 flex items-center gap-4 text-left transition-colors
                      ${isCurrent ? 'bg-primary/10 cursor-default' : 'hover:bg-white/5 cursor-pointer'}
                      disabled:opacity-60`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isCurrent ? 'bg-primary/20 text-primary' : 'bg-background-dark text-slate-500'}`}>
                      <span className="material-icons-round text-lg">{meta.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-white'}`}>{meta.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide
                          ${isCurrent ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-400'}`}>
                          {meta.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{meta.description}</p>
                    </div>
                    {isCurrent && <span className="material-icons-round text-primary text-lg">radio_button_checked</span>}
                    {!isCurrent && isChangingStrategy && <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-surface rounded-lg p-1.5 grid grid-cols-2 gap-2 shadow-inner border border-white/5">
          <button
            onClick={handleStart}
            disabled={isSubmitting || isActive}
            className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${isActive ? 'bg-primary/20 text-primary' : 'bg-primary shadow-glow text-white'} disabled:opacity-50`}
          >
            <span className="material-icons-round text-base">play_circle</span>
            {isSubmitting ? 'Working...' : 'Start Trading'}
          </button>
          <button
            onClick={handleStop}
            disabled={isSubmitting || !isActive}
            className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${!isActive ? 'bg-danger/20 text-danger' : 'bg-danger text-white'} disabled:opacity-50`}
          >
            <span className="material-icons-round text-base">pause_circle</span>
            {isSubmitting ? 'Working...' : 'Stop Trading'}
          </button>
        </div>

        {/* Rule Description */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 px-1">Logic Description</h3>
          <div className="glass-panel rounded-lg p-5">
            <div className="flex gap-4">
              <div className="mt-1 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                <span className="material-icons-round text-lg">psychology</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{description}</p>
            </div>
          </div>
        </div>

        {/* Parameters List */}
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-sm font-semibold text-slate-300">Parameters</h3>
            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary uppercase tracking-wide">
              {currentSymbol} preset
            </span>
          </div>
          <div className="bg-surface rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {Object.entries(params).filter(([key]) => key !== 'symbol').map(([key, value]) => {
              const icon = PARAM_ICONS[key] || 'settings'
              const label = PARAM_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              const desc = paramDescs[key] || ''
              const highlight = isHighlightParam(key)
              const draftValue = paramsDraft[key] ?? value

              return (
                <div key={key} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background-dark flex items-center justify-center text-slate-500">
                      <span className="material-icons-round text-lg">{icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      {desc && <p className="text-xs text-slate-500 max-w-[200px] truncate">{desc}</p>}
                    </div>
                  </div>
                  <input
                    className={`font-mono px-3 py-1 rounded text-sm font-bold w-36 text-right border ${highlight ? 'text-primary bg-primary/10 border-primary/30' : 'text-white bg-surface-highlight border-white/10'} focus:outline-none focus:border-primary`}
                    value={String(draftValue)}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    disabled={isSavingParams}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveParams}
              disabled={isSavingParams}
              className="mt-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {isSavingParams ? 'Saving...' : `Save as ${currentSymbol} Preset`}
            </button>
          </div>
        </div>

        {/* Latest Execution */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-slate-300 px-1">Latest Execution</h3>
          {latestTrade ? (
            <div className="bg-surface/50 border border-white/5 rounded-lg p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{formatTime(latestTrade.timestamp)}</span>
                <span className={`font-bold ${latestTrade.side?.toLowerCase() === 'buy' ? 'text-success' : 'text-danger'}`}>
                  {latestTrade.side?.toUpperCase()}
                </span>
                <span className="text-white">{latestTrade.symbol || 'BTC-USD'}</span>
              </div>
              <span className="font-mono text-slate-300">@ {formatPrice(latestTrade.price)}</span>
            </div>
          ) : (
            <div className="bg-surface/50 border border-white/5 rounded-lg p-3 text-xs text-slate-500 text-center">
              No executions yet
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 z-50">
        <div className="flex gap-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-4 bg-surface hover:bg-surface-highlight text-white rounded-lg font-semibold text-sm transition-colors border border-white/10 flex items-center justify-center gap-2 group"
          >
            <span className="material-icons-round text-slate-400 group-hover:text-white transition-colors">dashboard</span>
            Dashboard
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm shadow-glow transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-icons-round">history</span>
            View Logs
          </button>
        </div>
      </div>
    </div>
  )
}
