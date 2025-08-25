'use client'

import { useState, useEffect } from 'react'
import { useTradingContext } from '@/contexts/TradingContext'
import Header from './Header'
import PortfolioCard from './PortfolioCard'
import TradingControls from './TradingControls'
import PriceChart from './PriceChart'
import TradeHistory from './TradeHistory'
import StatusIndicator from './StatusIndicator'

export default function Dashboard() {
  const { 
    portfolio, 
    tradingStatus, 
    currentPrice,
    fetchPortfolio,
    fetchTradingStatus,
    fetchCurrentPrice
  } = useTradingContext()

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await Promise.all([
          fetchPortfolio(),
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
        {/* 상태 표시 */}
        <div className="mb-6">
          <StatusIndicator 
            isConnected={true} 
            tradingActive={tradingStatus?.is_active || false}
            currentPrice={currentPrice}
          />
        </div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 포트폴리오 카드 */}
          <div className="lg:col-span-1">
            <PortfolioCard portfolio={portfolio} />
          </div>
          
          {/* 트레이딩 컨트롤 */}
          <div className="lg:col-span-1">
            <TradingControls />
          </div>
          
          {/* 현재 가격 */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">현재 BTC 가격</h3>
              <div className="text-3xl font-bold text-crypto-green">
                ${currentPrice?.toLocaleString() || '0'}
              </div>
              <p className="text-gray-400 text-sm mt-2">USDT</p>
            </div>
          </div>
        </div>

        {/* 차트와 거래 내역 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">가격 차트</h3>
            <PriceChart />
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