'use client'

import { useState, useEffect } from 'react'
import { useTradingContext } from '@/contexts/TradingContext'
import Header from './Header'
import PortfolioCard from './PortfolioCard'
import TradeHistory from './TradeHistory'
import StatusIndicator from './StatusIndicator'
import PositionCard from './PositionCard'
import { usePortfolio } from '@/hooks/usePortfolio'
import HoldingsPieCard from './HoldingsPieCard'
import AssetChartCard from './AssetChartCard'
import AssetPnlTable from './AssetPnlTable'
import AutoTradeControls from './AutoTradeControls'

export default function Dashboard() {
  const { 
    portfolio, 
    multiAssetPortfolio,
    tradingStatus, 
    currentPrice,
    fetchPortfolio,
    fetchMultiAssetPortfolio,
    fetchTradingStatus,
    fetchCurrentPrice
  } = useTradingContext()

  // Use the new portfolio hook for multi-asset data
  const { 
    portfolioData, 
    isLoading: portfolioLoading, 
    error: portfolioError 
  } = usePortfolio(true, 30000)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await Promise.all([
          fetchPortfolio(),
          fetchMultiAssetPortfolio(),
          fetchTradingStatus(),
          fetchCurrentPrice()
        ])
      } catch (error) {
        console.error('대시보드 초기화 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeDashboard()

    // 실시간 업데이트 (30초마다)
    const interval = setInterval(() => {
      fetchCurrentPrice()
      fetchPortfolio()
      fetchTradingStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchPortfolio, fetchMultiAssetPortfolio, fetchTradingStatus, fetchCurrentPrice])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">대시보드 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Header tradingActive={tradingStatus?.is_active || false} />
      
      <div className="container mx-auto px-4 py-8">
        {/* 상단 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <StatusIndicator 
              isConnected={true} 
              tradingActive={tradingStatus?.is_active || false}
              currentPrice={currentPrice}
            />
          </div>
          <div className="lg:col-span-1">
            <PortfolioCard portfolio={portfolio} />
          </div>
          <div className="lg:col-span-1">
            <PositionCard />
          </div>
        </div>

        {/* 지갑 파이 + 보유 코인 차트 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <HoldingsPieCard portfolioData={portfolioData} />
          <AssetChartCard portfolioData={portfolioData} />
        </div>

        {/* 자동매매 컨트롤 */}
        <div className="mb-8">
          <AutoTradeControls onStatusChanged={fetchTradingStatus} />
        </div>

        {/* 코인별 손익률 */}
        <div className="mb-8">
          <AssetPnlTable portfolioData={portfolioData} />
        </div>

        {/* 거래 내역 */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">거래 내역</h3>
          <TradeHistory />
        </div>
      </div>
    </div>
  )
}
