'use client'

import { useState, useEffect } from 'react'
import { useTradingContext } from '@/contexts/TradingContext'
import Header from './Header'
import PortfolioCard from './PortfolioCard'
import PortfolioPieChart from './PortfolioPieChart'
import TradingControls from './TradingControls'
import EnhancedPriceChart from './EnhancedPriceChart'
import TradeHistory from './TradeHistory'
import StatusIndicator from './StatusIndicator'
import PerformanceChart from './PerformanceChart'
import TradingSignals from './TradingSignals'
import PositionCard from './PositionCard'
import PositionManager from './PositionManager'
import PositionPnLChart from './PositionPnLChart'
import { usePortfolio } from '@/hooks/usePortfolio'

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
    }, 30000)

    return () => clearInterval(interval)
  }, [])

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
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* 실제 거래 경고 배너 */}
        <div className="mb-6 bg-gradient-to-r from-red-600 to-orange-600 border border-red-500 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">⚠️ 실제 거래 모드 활성화</h3>
              <p className="text-red-100 text-sm mt-1">
                현재 실제 자금으로 거래 중입니다. 최대 거래 금액: $30 | 손실 위험이 있으니 주의하세요.
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-800 text-red-100">
                LIVE TRADING
              </span>
            </div>
          </div>
        </div>

        {/* 상태 표시 */}
        <div className="mb-6">
          <StatusIndicator 
            isConnected={true} 
            tradingActive={tradingStatus?.is_active || false}
            currentPrice={currentPrice}
          />
        </div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* 포트폴리오 카드 */}
          <div className="lg:col-span-1">
            <PortfolioCard portfolio={portfolio} />
          </div>
          
          {/* 현재 포지션 */}
          <div className="lg:col-span-1">
            <PositionCard />
          </div>
          
          {/* 트레이딩 컨트롤 */}
          <div className="lg:col-span-1">
            <TradingControls />
          </div>
          
          {/* 실시간 신호 */}
          <div className="lg:col-span-1">
            <div className="card">
              <TradingSignals />
            </div>
          </div>
        </div>

        {/* 포트폴리오 분산 차트 */}
        <div className="mb-8">
          <PortfolioPieChart 
            portfolioData={portfolioData}
            legacyPortfolio={portfolio}
            onAssetClick={(symbol) => {
              console.log('Asset clicked:', symbol)
              // TODO: Navigate to asset detail view
            }}
          />
        </div>

        {/* 포지션 관리 */}
        <div className="mb-8">
          <PositionManager />
        </div>

        {/* 포지션 P&L 시각화 */}
        <div className="mb-8">
          <PositionPnLChart />
        </div>

        {/* 성과 차트 */}
        <div className="mb-8">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">포트폴리오 성과</h3>
            <PerformanceChart />
          </div>
        </div>

        {/* 차트와 거래 내역 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">가격 차트</h3>
            <EnhancedPriceChart symbol="BTCUSDT" showMarkers={true} />
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">거래 내역</h3>
            <TradeHistory />
          </div>
        </div>
      </div>
    </div>
  )
}
