'use client'

import { useState, useEffect, useCallback } from 'react'
import { tradingApi } from '@/utils/api'

interface Trade {
  timestamp: string
  side: string
  price: number
  qty: number
  pnl?: number | null
  symbol?: string
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return timestamp
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function RecentExecutions() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTrades = useCallback(async () => {
    try {
      const data = await tradingApi.getTradeHistory()
      setTrades(data.trades || [])
    } catch {
      setTrades([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 30000)
    return () => clearInterval(interval)
  }, [fetchTrades])

  return (
    <div className="bg-card-dark rounded-xl border border-slate-700/60 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/60 flex justify-between items-center">
        <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider">Recent Executions</h3>
        <span className="text-slate-500 text-xs">{trades.length} trades</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Side</th>
              <th className="px-6 py-3">Price</th>
              <th className="px-6 py-3 text-right">Size</th>
              <th className="px-6 py-3 text-right">PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No trades yet</td>
              </tr>
            ) : (
              trades.slice(0, 10).map((trade, i) => {
                const isBuy = trade.side?.toLowerCase() === 'buy'
                return (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">{formatTime(trade.timestamp)}</td>
                    <td className="px-6 py-3">
                      <span className={`font-bold px-2 py-0.5 rounded text-xs ${isBuy ? 'text-green-500 bg-green-500/10' : 'text-red-400 bg-red-400/10'}`}>
                        {trade.side?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-white">{formatPrice(trade.price)}</td>
                    <td className="px-6 py-3 text-right">{trade.qty}</td>
                    <td className="px-6 py-3 text-right">
                      {trade.pnl != null && trade.pnl !== 0 ? (
                        <span className={`font-bold ${trade.pnl > 0 ? 'text-primary' : 'text-red-400'}`}>
                          {trade.pnl > 0 ? '+' : ''}${formatPrice(Math.abs(trade.pnl))}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
