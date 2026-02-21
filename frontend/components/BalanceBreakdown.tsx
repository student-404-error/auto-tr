'use client'

import { useState, useEffect, useCallback } from 'react'
import { tradingApi } from '@/utils/api'

interface BalanceEntry {
  balance: number
  available: number
}

interface BalanceBreakdownProps {
  balances: Record<string, BalanceEntry>
}

// 코인별 심볼 매핑 (가격 조회용)
const COIN_SYMBOL_MAP: Record<string, string> = {
  BTC: 'BTCUSDT',
  SOL: 'SOLUSDT',
  XRP: 'XRPUSDT',
}

// 코인별 표시 정밀도
const COIN_PRECISION: Record<string, number> = {
  BTC: 6,
  SOL: 4,
  XRP: 2,
  USDT: 2,
}

function formatCoinQty(coin: string, qty: number): string {
  const precision = COIN_PRECISION[coin] ?? 4
  return qty.toFixed(precision)
}

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BalanceBreakdown({ balances }: BalanceBreakdownProps) {
  const [prices, setPrices] = useState<Record<string, number>>({})

  const fetchPrices = useCallback(async () => {
    const coins = Object.keys(balances).filter((c) => c !== 'USDT' && COIN_SYMBOL_MAP[c])
    if (coins.length === 0) return

    const results: Record<string, number> = {}
    await Promise.allSettled(
      coins.map(async (coin) => {
        try {
          const data = await tradingApi.getPrice(COIN_SYMBOL_MAP[coin])
          results[coin] = data.price || 0
        } catch {
          // keep previous price
        }
      })
    )
    setPrices((prev) => ({ ...prev, ...results }))
  }, [balances])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [fetchPrices])

  // 잔고가 0보다 큰 코인만 표시 (USDT는 항상)
  const entries = Object.entries(balances)
    .filter(([coin, b]) => coin === 'USDT' || b.balance > 0)
    .map(([coin, b]) => {
      const price = coin === 'USDT' ? 1 : prices[coin] || 0
      const usdValue = b.balance * price
      return { coin, ...b, price, usdValue }
    })
    .sort((a, b) => b.usdValue - a.usdValue) // USD 가치 내림차순

  const totalUsd = entries.reduce((sum, e) => sum + e.usdValue, 0)

  return (
    <div className="bg-gradient-to-br from-card-dark to-slate-900 rounded-xl p-5 border border-slate-700/60 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Balance Breakdown</h4>
        <span className="text-xs font-mono text-slate-300">${formatUsd(totalUsd)}</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No balances</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const pct = totalUsd > 0 ? (e.usdValue / totalUsd) * 100 : 0
            return (
              <div key={e.coin} className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-white">{e.coin}</span>
                  <span className="text-sm font-mono text-white">${formatUsd(e.usdValue)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                  <span>{formatCoinQty(e.coin, e.balance)}</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                {/* allocation bar */}
                <div className="w-full bg-slate-700/50 rounded-full h-1 mt-2">
                  <div
                    className="h-1 rounded-full bg-primary/70 transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                {e.balance !== e.available && (
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    avail: {formatCoinQty(e.coin, e.available)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
