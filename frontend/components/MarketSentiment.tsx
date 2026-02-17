'use client'

import { useState, useEffect, useCallback } from 'react'
import { tradingApi } from '@/utils/api'

interface SentimentData {
  fundingRate: string
  volume24h: string
  bullishPercent: number
}

export default function MarketSentiment() {
  const [data, setData] = useState<SentimentData>({
    fundingRate: '-',
    volume24h: '-',
    bullishPercent: 50,
  })

  const fetchData = useCallback(async () => {
    try {
      const priceData = await tradingApi.getPrice('BTCUSDT')
      const change = priceData.change_24h || 0
      const bullish = Math.max(20, Math.min(80, 50 + change * 5))

      setData({
        fundingRate: priceData.funding_rate
          ? `${priceData.funding_rate > 0 ? '+' : ''}${(priceData.funding_rate * 100).toFixed(4)}%`
          : '+0.01%',
        volume24h: priceData.volume_24h
          ? `$${(priceData.volume_24h / 1e9).toFixed(0)}B`
          : '-',
        bullishPercent: Math.round(bullish),
      })
    } catch {
      // Keep existing data
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="bg-gradient-to-br from-card-dark to-slate-900 rounded-xl p-5 border border-slate-700/60 shadow-sm">
      <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Market Sentiment</h4>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-white">Bullish</span>
        <span className="text-sm font-mono text-primary">{data.bullishPercent}%</span>
      </div>
      <div className="w-full bg-slate-800 h-1.5 rounded-full mb-4">
        <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${data.bullishPercent}%` }}></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-[10px] text-slate-500 uppercase">Funding</div>
          <div className="text-xs font-mono text-green-400">{data.fundingRate}</div>
        </div>
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-[10px] text-slate-500 uppercase">24h Vol</div>
          <div className="text-xs font-mono text-white">{data.volume24h}</div>
        </div>
      </div>
    </div>
  )
}
