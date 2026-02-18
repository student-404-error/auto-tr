'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { tradingApi } from '@/utils/api'
import { isAuthenticated, restoreAuthHeader } from '@/utils/auth'

interface PortfolioSnapshot {
  timestamp: string
  total_portfolio_value: number
}

interface MonthlyReturn {
  label: string
  change: number
}

type AllocationEntry = {
  symbol: string
  percentage: number
}

interface PerformanceStats {
  daily_change_percent?: number
  weekly_change_percent?: number
  monthly_change_percent?: number
}

interface ClosedPosition {
  realized_pnl?: number
  [key: string]: unknown
}

type RangeKey = '1D' | '1W' | '1M' | 'YTD' | 'ALL'

const RANGE_PERIOD_MAP: Record<RangeKey, string> = {
  '1D': '1d',
  '1W': '7d',
  '1M': '30d',
  YTD: 'ytd',
  ALL: 'all',
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRange, setSelectedRange] = useState<RangeKey>('1M')
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [history, setHistory] = useState<PortfolioSnapshot[]>([])
  const [performance, setPerformance] = useState<PerformanceStats | null>(null)
  const [allocation, setAllocation] = useState<AllocationEntry[]>([])
  const [tradeStats, setTradeStats] = useState({ winRate: 64, riskReward: 2.1, drawdown: 4.2, sharpe: 2.8 })

  useEffect(() => {
    restoreAuthHeader()
    if (!isAuthenticated()) {
      router.replace('/auth')
      return
    }
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    if (loading) {
      // initial load: keep loading spinner
    } else {
      setRefreshing(true)
    }
    ;(async () => {
      try {
        const [portfolioData, perfData, summaryData, historyData, allocationData, trades] = await Promise.all([
          tradingApi.getPortfolio(),
          tradingApi.getPortfolioPerformance(),
          tradingApi.getPositionsSummary(),
          tradingApi.getPortfolioHistory(RANGE_PERIOD_MAP[selectedRange]),
          tradingApi.getAssetAllocation(),
          tradingApi.getTradeHistory(),
        ])

        setPortfolioValue(portfolioData.total_value_usd || 0)
        setPerformance(perfData)
        setHistory(historyData.history || historyData)
        setAllocation(
          Object.entries(allocationData.allocation || allocationData).map(([symbol, percentage]) => ({
            symbol,
            percentage: Number(percentage || 0),
          }))
        )

        const tradesList = trades.trades || []
        const winRate = Number(summaryData?.statistics?.win_rate || 0)

        const closed = summaryData?.recent_closed_positions || []
        const realized = closed.map((p: ClosedPosition) => Number(p.realized_pnl || 0))
        const winners = realized.filter((x: number) => x > 0)
        const losers = realized.filter((x: number) => x < 0)
        const avgWin = winners.length ? winners.reduce((a: number, b: number) => a + b, 0) / winners.length : 0
        const avgLossAbs = losers.length
          ? Math.abs(losers.reduce((a: number, b: number) => a + b, 0) / losers.length)
          : 0
        const riskReward = avgLossAbs > 0 ? avgWin / avgLossAbs : 0

        const historyRows = historyData.history || historyData || []
        const values = historyRows.map((h: PortfolioSnapshot) => Number(h.total_portfolio_value || 0)).filter((v: number) => v > 0)
        let maxDrawdown = 0
        let peak = values[0] || 0
        for (const v of values) {
          if (v > peak) peak = v
          if (peak > 0) {
            const dd = ((peak - v) / peak) * 100
            if (dd > maxDrawdown) maxDrawdown = dd
          }
        }

        const returns: number[] = []
        for (let i = 1; i < values.length; i++) {
          if (values[i - 1] > 0) returns.push((values[i] - values[i - 1]) / values[i - 1])
        }
        const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
        const variance = returns.length
          ? returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
          : 0
        const std = Math.sqrt(variance)
        const sharpe = std > 0 ? (mean / std) * Math.sqrt(returns.length) : 0

        setTradeStats({ winRate, riskReward, drawdown: maxDrawdown, sharpe })
      } catch (error) {
        console.error('analytics load error', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    })()
  }, [authChecked, selectedRange])

  const monthlyReturns = useMemo<MonthlyReturn[]>(() => {
    if (!history.length) {
      return [
        { label: 'MAR 24', change: 4.2 },
        { label: 'FEB 24', change: -0.5 },
        { label: 'JAN 24', change: 2.1 },
      ]
    }

    const map = new Map<string, { start: number; end: number }>()
    history.forEach((entry) => {
      const date = new Date(entry.timestamp)
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      if (!map.has(label)) {
        map.set(label, { start: entry.total_portfolio_value, end: entry.total_portfolio_value })
        return
      }
      const current = map.get(label)!
      if (entry.total_portfolio_value < current.start) {
        current.start = entry.total_portfolio_value
      }
      current.end = entry.total_portfolio_value
    })

    return Array.from(map.entries())
      .map(([label, { start, end }]) => ({
        label,
        change: start > 0 ? ((end - start) / start) * 100 : 0,
      }))
      .slice(-3)
      .reverse()
  }, [history])

  const equityCurvePoints = useMemo(() => {
    if (!history.length) {
      return ''
    }
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const values = sorted
      .map((item) => Number(item.total_portfolio_value))
      .filter((v) => Number.isFinite(v))
    if (values.length < 2) return ''
    const max = Math.max(...values)
    const min = Math.min(...values)
    return values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * 1000
        const y = max === min ? 50 : 100 - ((value - min) / (max - min)) * 80
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .filter(Boolean)
      .join(' ')
  }, [history])

  const rangeReturnPercent = useMemo(() => {
    if (history.length < 2) return 0
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const start = Number(sorted[0].total_portfolio_value || 0)
    const end = Number(sorted[sorted.length - 1].total_portfolio_value || 0)
    if (start <= 0) return 0
    return ((end - start) / start) * 100
  }, [history])

  if (!authChecked || loading) {
    return null
  }

  return (
    <div className="flex h-screen w-full">
      <Sidebar serverOnline={true} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 border-b border-white/5 bg-background-dark/80 backdrop-blur-md px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Total Equity</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-2xl font-bold tracking-tight">
                  ${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </h2>
                <span className="text-success text-sm font-bold flex items-center gap-0.5">
                  <span className="material-icons-round text-sm">trending_up</span>
                  {rangeReturnPercent >= 0 ? '+' : ''}{rangeReturnPercent.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div>
              <h1 className="text-xl font-bold">Performance Analytics</h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {refreshing && <span className="text-xs text-gray-400">Updating...</span>}
            <div className="flex p-1 bg-surface-dark rounded-lg border border-white/5">
              {(['1D', '1W', '1M', 'YTD', 'ALL'] as RangeKey[]).map((label) => (
                <button
                  key={label}
                  onClick={() => setSelectedRange(label)}
                  className={`px-4 py-1.5 text-xs font-medium rounded ${label === selectedRange ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white transition-colors'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-6 rounded-lg shadow-glow flex items-center gap-2 transition-all">
              <span className="material-icons-round text-sm">ios_share</span>
              Export
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <section className="bg-surface-dark rounded-xl border border-white/5 p-6 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Equity Curve ({selectedRange} View)</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-gray-300">Strategy A</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                  <span className="text-gray-500">Benchmark</span>
                </div>
              </div>
            </div>
            <div className="relative h-80 w-full">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="w-full border-t border-gray-400"></div>
                ))}
              </div>
              <svg className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="none" viewBox="0 0 1000 100">
                <defs>
                  <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#1e94f6" stopOpacity={0.25}></stop>
                    <stop offset="100%" stopColor="#1e94f6" stopOpacity={0}></stop>
                  </linearGradient>
                </defs>
                {equityCurvePoints ? (
                  <>
                    <polygon points={`${equityCurvePoints} 1000,100 0,100`} fill="url(#curveFill)"></polygon>
                    <polyline points={equityCurvePoints} fill="none" stroke="#1e94f6" strokeLinecap="round" strokeWidth="2"></polyline>
                  </>
                ) : null}
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between pt-4 text-[11px] text-gray-500 font-medium">
                {history.length > 0
                  ? [history[0], history[Math.floor(history.length / 2)], history[history.length - 1]]
                      .filter(Boolean)
                      .map((entry, idx) => (
                        <span key={`${entry.timestamp}_${idx}`}>
                          {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        </span>
                      ))
                  : ['-', '-', '-'].map((label, idx) => (
                      <span key={`${label}_${idx}`}>{label}</span>
                    ))}
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[{
              label: 'Win Rate',
              icon: 'pie_chart',
              value: `${tradeStats.winRate.toFixed(0)}%`,
              caption: 'Strategy A vs benchmark',
            }, {
              label: 'Avg Risk:Reward',
              icon: 'balance',
              value: tradeStats.riskReward.toFixed(1),
              caption: 'Average across winners',
            }, {
              label: 'Max Drawdown',
              icon: 'trending_down',
              value: `-${tradeStats.drawdown.toFixed(1)}%`,
              caption: 'Peak-to-trough loss',
              danger: true,
            }, {
              label: 'Sharpe Ratio',
              icon: 'insights',
              value: tradeStats.sharpe.toFixed(1),
              caption: 'Risk-adjusted score',
            }].map((card) => (
              <div
                key={card.label}
                className={`bg-surface-dark p-6 rounded-xl border border-white/5 ${card.danger ? 'hover:border-danger/40' : 'hover:border-primary/40'} transition-all group`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{card.label}</span>
                  <div className={`p-2 ${card.danger ? 'bg-danger/10' : 'bg-primary/10'} rounded-lg`}>
                    <span className={`material-icons-round text-xl ${card.danger ? 'text-danger' : 'text-primary'}`}>{card.icon}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-3xl font-bold ${card.danger ? 'text-danger' : 'text-white'}`}>{card.value}</span>
                  <div className="h-2 flex-1 bg-white/5 rounded-full mb-1 overflow-hidden">
                    <div
                      className={`h-full ${card.danger ? 'bg-danger' : 'bg-primary'} rounded-full shadow-glow`}
                      style={{ width: `${Math.min(100, Math.max(0, tradeStats.winRate))}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">{card.caption}</p>
              </div>
            ))}
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-surface-dark rounded-xl border border-white/5 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Monthly Returns</h3>
                <button className="text-xs text-primary font-bold hover:underline">Full History</button>
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-6 text-[10px] text-gray-500 font-bold uppercase py-2 px-4 border-b border-white/5 mb-2">
                  <div className="col-span-1">Month</div>
                  <div className="col-span-4">Performance Relative to Target</div>
                  <div className="col-span-1 text-right">Return</div>
                </div>
                {!monthlyReturns.length && <div className="text-center text-gray-500">No history available.</div>}
                {monthlyReturns.map((entry) => (
                  <div
                    key={entry.label}
                    className="grid grid-cols-6 items-center py-3 px-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="col-span-1 font-bold">{entry.label}</div>
                    <div className="col-span-4 px-4">
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden flex items-center">
                        <div
                          className={`h-full ${entry.change >= 0 ? 'bg-success' : 'bg-danger'} rounded-r-full shadow-glow`}
                          style={{ width: `${Math.min(100, Math.abs(entry.change))}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={`col-span-1 text-right font-bold ${entry.change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {entry.change >= 0 ? '+' : ''}{entry.change.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 bg-surface-dark rounded-xl border border-white/5 p-6">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-6">Asset Allocation</h3>
              <div className="flex items-center gap-8 h-full pb-6">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="transparent"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="3.5"
                    ></circle>
                    {allocation.slice(0, 3).map((entry, index) => {
                      const offset = allocation.slice(0, index).reduce((sum, prev) => sum + prev.percentage, 0)
                      const colors = ['#1e94f6', '#10b981', '#f59e0b', '#a855f7']
                      return (
                        <circle
                          key={entry.symbol}
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="transparent"
                          stroke={colors[index % colors.length]}
                          strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        ></circle>
                      )
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500 uppercase">Active</span>
                    <span className="text-lg font-bold">12 Pos</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  {allocation.map((entry, idx) => (
                    <div key={entry.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ['#1e94f6', '#10b981', '#f59e0b', '#a855f7'][idx % 4] }}
                        ></span>
                        <span className="text-xs text-gray-300">{entry.symbol}</span>
                      </div>
                      <span className="text-xs font-bold">{entry.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                      Portfolio rebalancing occurs every Sunday at 21:00 UTC.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
