'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react'
import { tradingApi } from '@/utils/api'
import { PortfolioData } from '@/services/portfolioService'
import { useSimpleBTCPriceAPI } from '@/hooks/useSimpleBTCPriceAPI'

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

interface Position {
  id: string
  symbol: string
  type: 'long' | 'short'
  entryPrice: number
  quantity: number
  dollarAmount: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  openTime: string
  status: 'open' | 'closed'
}

interface TradingContextType {
  portfolio: Portfolio | null
  multiAssetPortfolio: PortfolioData | null
  tradingStatus: TradingStatus | null
  currentPrice: number | null
  positions: Position[]
  isLoading: boolean
  error: string | null

  fetchPortfolio: () => Promise<void>
  fetchMultiAssetPortfolio: () => Promise<void>
  fetchTradingStatus: () => Promise<void>
  fetchCurrentPrice: () => Promise<void>
  fetchPositions: () => Promise<void>
  startTrading: () => Promise<void>
  stopTrading: () => Promise<void>
  placeOrder: (side: string, qty: string) => Promise<void>
  openPosition: (type: 'long' | 'short', symbol: string, qty: string) => Promise<void>
  closePosition: (positionId: string) => Promise<void>
  getAvailableBalance: (asset: string) => number
  validateOrder: (side: string, amount: string, inputMode: 'quantity' | 'dollar') => string[]
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export function TradingProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [multiAssetPortfolio, setMultiAssetPortfolio] = useState<PortfolioData | null>(null)
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // REST API를 통한 BTC 가격 (5초마다 업데이트)
  const { price: currentPrice } = useSimpleBTCPriceAPI()

  const fetchPortfolio = useCallback(async () => {
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
  }, [])

  const fetchMultiAssetPortfolio = useCallback(async () => {
    try {
      setError(null)
      const data = await tradingApi.getMultiAssetPortfolio()
      setMultiAssetPortfolio(data)
    } catch (err) {
      setError('다중 자산 포트폴리오 조회 실패')
      console.error('Multi-asset portfolio fetch error:', err)
    }
  }, [])

  const fetchTradingStatus = useCallback(async () => {
    try {
      setError(null)
      const data = await tradingApi.getTradingStatus()
      setTradingStatus(data)
    } catch (err) {
      setError('트레이딩 상태 조회 실패')
      console.error('Trading status fetch error:', err)
    }
  }, [])

  const fetchCurrentPrice = useCallback(async () => {
    // REST API를 통한 가격 조회
    try {
      setError(null)
      // 추가적인 가격 조회가 필요한 경우 여기서 처리
      // 현재는 useSimpleBTCPriceAPI 훅에서 자동으로 처리됨
    } catch (err) {
      setError('가격 조회 실패')
      console.error('Price fetch error:', err)
    }
  }, [])

  const fetchPositions = useCallback(async () => {
    try {
      setError(null)
      const data = await tradingApi.getPositions()
      setPositions(data.positions || [])
    } catch (err) {
      setError('포지션 조회 실패')
      console.error('Positions fetch error:', err)
    }
  }, [])

  const startTrading = useCallback(async () => {
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
  }, [fetchTradingStatus])

  const stopTrading = useCallback(async () => {
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
  }, [fetchTradingStatus])

  const placeOrder = useCallback(async (side: string, qty: string) => {
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
  }, [fetchPortfolio])

  const openPosition = useCallback(async (type: 'long' | 'short', symbol: string, qty: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get current price for entry_price
      const quantity = parseFloat(qty)
      const entryPrice = currentPrice || 0
      const dollarAmount = quantity * entryPrice
      
      await tradingApi.openPosition(symbol, type, entryPrice, quantity, dollarAmount)
      await fetchPositions()
      await fetchPortfolio()
    } catch (err) {
      setError('포지션 열기 실패')
      console.error('Open position error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchPositions, fetchPortfolio, currentPrice])

  const closePosition = useCallback(async (positionId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      await tradingApi.closePosition(positionId)
      await fetchPositions()
      await fetchPortfolio()
    } catch (err) {
      setError('포지션 닫기 실패')
      console.error('Close position error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchPositions, fetchPortfolio])

  const getAvailableBalance = useCallback((asset: string): number => {
    if (!portfolio) return 0
    
    if (asset === 'USDT' || asset === 'USD') {
      // Return available USD/USDT balance
      return portfolio.balances?.USDT?.available || 0
    } else if (asset === 'BTC') {
      // Return available BTC balance
      return portfolio.balances?.BTC?.available || 0
    }
    
    return 0
  }, [portfolio])

  const validateOrder = useCallback((side: string, amount: string, inputMode: 'quantity' | 'dollar'): string[] => {
    const errors: string[] = []
    
    if (inputMode === 'dollar') {
      const dollarValue = parseFloat(amount)
      if (isNaN(dollarValue) || dollarValue <= 0) {
        errors.push('유효한 달러 금액을 입력하세요')
      }
      
      const minAmount = side === 'Buy' ? 1 : 1
      if (dollarValue < minAmount) {
        errors.push(`최소 주문 금액은 $${minAmount}입니다`)
      }
      
      if (side === 'Buy') {
        const availableUSD = getAvailableBalance('USDT')
        if (dollarValue > availableUSD) {
          errors.push(`잔액이 부족합니다. 사용 가능한 금액: $${availableUSD.toFixed(2)}`)
        }
      } else {
        // For sell orders, check if we have enough BTC
        if (currentPrice && currentPrice > 0) {
          const requiredBTC = dollarValue / currentPrice
          const availableBTC = getAvailableBalance('BTC')
          if (requiredBTC > availableBTC) {
            errors.push(`BTC 잔액이 부족합니다. 보유량: ${availableBTC.toFixed(6)} BTC`)
          }
        }
      }
    } else {
      const quantity = parseFloat(amount)
      if (isNaN(quantity) || quantity <= 0) {
        errors.push('유효한 수량을 입력하세요')
      }
      
      if (quantity < 0.001) {
        errors.push('최소 주문 수량은 0.001 BTC입니다')
      }
      
      if (side === 'Sell') {
        const availableBTC = getAvailableBalance('BTC')
        if (quantity > availableBTC) {
          errors.push(`BTC 잔액이 부족합니다. 보유량: ${availableBTC.toFixed(6)} BTC`)
        }
      } else {
        // For buy orders, check if we have enough USD
        if (currentPrice && currentPrice > 0) {
          const requiredUSD = quantity * currentPrice
          const availableUSD = getAvailableBalance('USDT')
          if (requiredUSD > availableUSD) {
            errors.push(`잔액이 부족합니다. 필요 금액: $${requiredUSD.toFixed(2)}, 사용 가능: $${availableUSD.toFixed(2)}`)
          }
        }
      }
    }
    
    return errors
  }, [currentPrice, getAvailableBalance])

  // useMemo로 value 객체 메모이제이션
  const value: TradingContextType = useMemo(() => ({
    portfolio,
    multiAssetPortfolio,
    tradingStatus,
    currentPrice,
    positions,
    isLoading,
    error,
    fetchPortfolio,
    fetchMultiAssetPortfolio,
    fetchTradingStatus,
    fetchCurrentPrice,
    fetchPositions,
    startTrading,
    stopTrading,
    placeOrder,
    openPosition,
    closePosition,
    getAvailableBalance,
    validateOrder,
  }), [
    portfolio,
    multiAssetPortfolio,
    tradingStatus,
    currentPrice,
    positions,
    isLoading,
    error,
    fetchPortfolio,
    fetchMultiAssetPortfolio,
    fetchTradingStatus,
    fetchCurrentPrice,
    fetchPositions,
    startTrading,
    stopTrading,
    placeOrder,
    openPosition,
    closePosition,
    getAvailableBalance,
    validateOrder,
  ])

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
