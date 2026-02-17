'use client'

import { useState, useEffect, useCallback } from 'react'
import { tradingApi } from '@/utils/api'
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'
import MetricCards from './MetricCards'
import EquityCurve from './EquityCurve'
import RecentExecutions from './RecentExecutions'
import LiveSignalLog from './LiveSignalLog'
import MarketSentiment from './MarketSentiment'

interface TradingStatus {
  is_active: boolean
  strategy_name?: string
  position?: string | null
  last_signal?: string | null
}

interface Portfolio {
  balances?: Record<string, { balance: number; available: number }>
  current_btc_price?: number
  total_value_usd?: number
  btc_position?: {
    unrealized_pnl?: number
    unrealized_pnl_percent?: number
    side?: string
    entry_price?: number
    liquidation_price?: number
    leverage?: string
    margin_ratio?: number
  }
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [serverOnline, setServerOnline] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [portfolioData, statusData, priceData] = await Promise.allSettled([
        tradingApi.getPortfolio(),
        tradingApi.getTradingStatus(),
        tradingApi.getPrice('BTCUSDT'),
      ])

      if (portfolioData.status === 'fulfilled') {
        setPortfolio(portfolioData.value)
      }
      if (statusData.status === 'fulfilled') {
        setTradingStatus(statusData.value)
      }
      if (priceData.status === 'fulfilled') {
        setCurrentPrice(priceData.value.price || 0)
      }

      const anySuccess = [portfolioData, statusData, priceData].some(r => r.status === 'fulfilled')
      setServerOnline(anySuccess)
    } catch {
      setServerOnline(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [fetchAll])

  if (isLoading) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center bg-background-dark">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Initializing dashboard...</p>
        </div>
      </div>
    )
  }

  const totalEquity = portfolio?.total_value_usd || 0
  const btcPos = portfolio?.btc_position
  const unrealizedPnl = btcPos?.unrealized_pnl || 0
  const unrealizedPnlPercent = btcPos?.unrealized_pnl_percent || 0
  const positionSide = btcPos?.side || null
  const entryPrice = btcPos?.entry_price || 0
  const liquidationPrice = btcPos?.liquidation_price || 0
  const leverage = btcPos?.leverage || ''
  const riskPercent = btcPos?.margin_ratio ? Math.round(btcPos.margin_ratio * 100) : 0

  return (
    <>
      <Sidebar serverOnline={serverOnline} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden h-screen pb-24 md:pb-6">
        <DashboardHeader
          symbol="BTCUSDT"
          markPrice={currentPrice}
          totalEquity={totalEquity}
          serverOnline={serverOnline}
        />

        <div className="p-5 md:p-8 space-y-6 max-w-7xl mx-auto">
          <MetricCards
            tradingStatus={tradingStatus}
            currentPrice={currentPrice}
            unrealizedPnl={unrealizedPnl}
            unrealizedPnlPercent={unrealizedPnlPercent}
            riskPercent={riskPercent}
            positionSide={positionSide}
            leverage={leverage}
            entryPrice={entryPrice}
            liquidationPrice={liquidationPrice}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <EquityCurve />
              <RecentExecutions />
            </div>

            <div className="space-y-6">
              <LiveSignalLog />
              <MarketSentiment />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
