'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { tradingApi } from '@/utils/api'
import { isAuthenticated, restoreAuthHeader } from '@/utils/auth'

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
}

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  regime_trend:
    'Trend-following strategy using a dual EMA regime filter. Enters long positions when the fast EMA crosses above the slow EMA by a minimum gap, and uses ATR-based trailing stops for risk management.',
  simple:
    'RSI and moving-average crossover strategy. Buys when RSI is oversold and short MA crosses above long MA. Sells when RSI is overbought or short MA crosses below long MA.',
}

const STRATEGY_NAMES: Record<string, string> = {
  regime_trend: 'Regime Trend Engine',
  simple: 'Simple RSI-MA Strategy',
}

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
  const [authChecked, setAuthChecked] = useState(false)

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
      const [statusRes, perfRes, summaryRes, tradesRes] = await Promise.allSettled([
        tradingApi.getTradingStatus(),
        tradingApi.getPortfolioPerformance(),
        tradingApi.getPositionsSummary(),
        tradingApi.getTradeHistory(),
      ])

      if (statusRes.status === 'fulfilled') setStatus(statusRes.value)
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
  const strategyName = STRATEGY_NAMES[strategyKey] || strategyKey
  const description = STRATEGY_DESCRIPTIONS[strategyKey] || 'Automated trading strategy.'
  const params = status?.parameters || {}
  const paramDescs = status?.parameter_descriptions || {}

  const totalReturn = performance?.monthly_change_percent || 0
  const totalReturnPositive = totalReturn >= 0
  const winRate = summary?.statistics?.win_rate || 0
  const totalTrades = summary?.statistics?.total_positions || 0
  const maxDD = 0

  return (
    <div className="w-full min-h-screen bg-background-dark text-slate-200 font-display flex flex-col antialiased">
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
      <main className="flex-1 px-5 pb-32 overflow-y-auto space-y-6 max-w-2xl mx-auto w-full">
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

        {/* Active/Paused Toggle */}
        <div className="bg-surface rounded-lg p-1.5 flex shadow-inner border border-white/5">
          <div className={`flex-1 py-3 px-4 rounded-md font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${isActive ? 'bg-primary shadow-glow text-white' : 'text-slate-500'}`}>
            <span className="material-icons-round text-base">play_circle</span>
            Active
          </div>
          <div className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${!isActive ? 'bg-danger/20 text-danger' : 'text-slate-500'}`}>
            <span className="material-icons-round text-base">pause_circle</span>
            Paused
          </div>
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
          </div>
          <div className="bg-surface rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {Object.entries(params).map(([key, value]) => {
              const icon = PARAM_ICONS[key] || 'settings'
              const label = PARAM_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              const desc = paramDescs[key] || ''
              const highlight = isHighlightParam(key)

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
                  <div className={`font-mono px-3 py-1 rounded text-sm font-bold ${highlight ? 'text-primary bg-primary/10 border border-primary/20' : 'text-white bg-surface-highlight'}`}>
                    {formatParamValue(key, value)}
                  </div>
                </div>
              )
            })}
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
