'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { tradingApi } from '@/utils/api'
import { PortfolioData } from '@/services/portfolioService'

interface Portfolio {
  balances: Record<string, { balance: number; available: number }>
  current_btc_price: number
  total_value_usd: number
  timestamp: number
  error?: string
  live_trading?: boolean
  authenticated?: boolean
  max_trade_amount?: number
}

interface TradingStatus {
  is_active: boolean
  position: string | null
  last_signal: string | null
  trade_amount: string
}

interface TradingContextType {
  portfolio: Portfolio | null
  multiAssetPortfolio: PortfolioData | null
  tradingStatus: TradingStatus | null
  currentPrice: number | null
  isLoading: boolean
  error: string | null

  fetchPortfolio: () => Promise<void>
  fetchMultiAssetPortfolio: () => Promise<void>
  fetchTradingStatus: () => Promise<void>
  fetchCurrentPrice: () => Promise<void>
  startTrading: () => Promise<void>
  stopTrading: () => Promise<void>
  placeOrder: (side: string, qty: string) => Promise<void>
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export function TradingProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [multiAssetPortfolio, setMultiAssetPortfolio] = useState<PortfolioData | null>(null)
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolio = async () => {
    try {
      setError(null)
      const data = await tradingApi.getPortfolio()
      setPortfolio(data)
      
      // API 키 설정 안내
      if (data.error || !data.authenticated) {
        setError('API 키를 설정하여 실제 거래를 시작하세요')
      }
    } catch (err) {
      setError('포트폴리오 조회 실패')
      console.error('Portfolio fetch error:', err)
    }
  }

  const fetchMultiAssetPortfolio = async () => {
    try {
      setError(null)
      const data = await tradingApi.getMultiAssetPortfolio()
      setMultiAssetPortfolio(data)
    } catch (err) {
      setError('다중 자산 포트폴리오 조회 실패')
      console.error('Multi-asset portfolio fetch error:', err)
    }
  }

  const fetchTradingStatus = async () => {
    try {
      setError(null)
      const data = await tradingApi.getTradingStatus()
      setTradingStatus(data)
    } catch (err) {
      setError('트레이딩 상태 조회 실패')
      console.error('Trading status fetch error:', err)
    }
  }

  const fetchCurrentPrice = async () => {
    try {
      setError(null)
      const data = await tradingApi.getPrice('BTCUSDT')
      setCurrentPrice(data.price)
    } catch (err) {
      setError('가격 조회 실패')
      console.error('Price fetch error:', err)
    }
  }

  const startTrading = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await tradingApi.startTrading()
      await fetchTradingStatus()
    } catch (err) {
      setError('자동매매 시작 실패')
      console.error('Start trading error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const stopTrading = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await tradingApi.stopTrading()
      await fetchTradingStatus()
    } catch (err) {
      setError('자동매매 중지 실패')
      console.error('Stop trading error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const placeOrder = async (side: string, qty: string) => {
    try {
      setIsLoading(true)
      setError(null)
      await tradingApi.placeOrder('BTCUSDT', side, qty)
      await fetchPortfolio()
    } catch (err) {
      setError('주문 실행 실패')
      console.error('Place order error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const value: TradingContextType = {
    portfolio,
    multiAssetPortfolio,
    tradingStatus,
    currentPrice,
    isLoading,
    error,
    fetchPortfolio,
    fetchMultiAssetPortfolio,
    fetchTradingStatus,
    fetchCurrentPrice,
    startTrading,
    stopTrading,
    placeOrder,
  }

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  )
}

export function useTradingContext() {
  const context = useContext(TradingContext)
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider')
  }
  return context
}