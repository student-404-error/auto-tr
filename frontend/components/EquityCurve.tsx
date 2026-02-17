'use client'

import { useState, useEffect, useCallback } from 'react'
import { tradingApi } from '@/utils/api'

interface HistoryPoint {
  timestamp: string
  total_value_usd: number
}

type Period = '1h' | '24h' | '7d'

const PERIOD_MAP: Record<Period, string> = {
  '1h': '1h',
  '24h': '24h',
  '7d': '7d',
}

export default function EquityCurve() {
  const [period, setPeriod] = useState<Period>('24h')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      const data = await tradingApi.getPortfolioHistory(PERIOD_MAP[period])
      setHistory(data.history || [])
    } catch {
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    setIsLoading(true)
    fetchHistory()
  }, [fetchHistory])

  const buildPath = () => {
    if (history.length < 2) return { linePath: '', areaPath: '', lastPoint: undefined }

    const values = history.map(h => h.total_value_usd)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * 100,
      y: 50 - ((v - min) / range) * 45,
    }))

    let linePath = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx = (prev.x + curr.x) / 2
      linePath += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }

    const lastPoint = points[points.length - 1]
    const areaPath = `${linePath} L${lastPoint.x},50 L${points[0].x},50 Z`

    return { linePath, areaPath, lastPoint }
  }

  const { linePath, areaPath, lastPoint } = buildPath()

  return (
    <div className="bg-card-dark rounded-xl border border-slate-700/60 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">
          <span className="material-icons text-primary text-sm">insights</span>
          Equity Curve ({period.toUpperCase()})
        </h3>
        <div className="flex gap-2">
          {(['1h', '24h', '7d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                period === p
                  ? 'font-bold bg-primary/20 text-primary border border-primary/30'
                  : 'bg-slate-800 text-slate-500 hover:text-white transition-colors'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48 w-full relative">
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-600 font-mono pointer-events-none opacity-30">
          <div className="border-b border-dashed border-slate-700 w-full h-0"></div>
          <div className="border-b border-dashed border-slate-700 w-full h-0"></div>
          <div className="border-b border-dashed border-slate-700 w-full h-0"></div>
          <div className="border-b border-dashed border-slate-700 w-full h-0"></div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-500 text-sm">Loading...</span>
          </div>
        ) : history.length < 2 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-500 text-sm">Not enough data for this period</span>
          </div>
        ) : (
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
            <defs>
              <linearGradient id="gradientArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1e94f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1e94f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#gradientArea)" stroke="none" />
            <path d={linePath} fill="none" stroke="#1e94f6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            {lastPoint && (
              <circle className="fill-white animate-pulse" cx={lastPoint.x} cy={lastPoint.y} r="2" />
            )}
          </svg>
        )}
      </div>
    </div>
  )
}
