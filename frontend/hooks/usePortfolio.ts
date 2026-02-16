'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { portfolioService, PortfolioData, PortfolioAllocation } from '@/services/portfolioService'
import { tradingApi } from '@/utils/api'

interface UsePortfolioReturn {
  portfolioData: PortfolioData | null
  allocation: PortfolioAllocation | null
  isLoading: boolean
  error: string | null
  realTimeValues: {
    totalValue: number
    totalPnl: number
    totalPnlPercent: number
    assets: Record<string, any>
  } | null
  refreshPortfolio: () => Promise<void>
  clearCache: () => void
}

export function usePortfolio(autoRefresh: boolean = true, refreshInterval: number = 30000): UsePortfolioReturn {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realTimeValues, setRealTimeValues] = useState<any>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPortfolioData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [portfolioResponse, allocationResponse] = await Promise.all([
        portfolioService.getMultiAssetPortfolio(),
        portfolioService.getAssetAllocation()
      ])

      setPortfolioData(portfolioResponse)
      setAllocation(allocationResponse)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio data'
      setError(errorMessage)
      console.error('Portfolio fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateRealTimePrices = useCallback(async () => {
    if (!portfolioData) return

    try {
      // Fetch current prices for all supported assets
      const currentPrices: Record<string, number> = {}
      const symbols = portfolioData.supported_assets
      const results = await Promise.allSettled(symbols.map((symbol) => tradingApi.getPrice(symbol)))
      results.forEach((result, index) => {
        const symbol = symbols[index]
        if (result.status === 'fulfilled') {
          currentPrices[symbol] = result.value.price
          return
        }
        console.warn(`Failed to fetch price for ${symbol}:`, result.reason)
        if (portfolioData.assets[symbol]) {
          currentPrices[symbol] = portfolioData.assets[symbol].current_price
        }
      })

      // Calculate real-time portfolio values
      const realTimeData = await portfolioService.calculateRealTimePortfolioValue(
        portfolioData,
        currentPrices
      )

      setRealTimeValues(realTimeData)

    } catch (err) {
      console.error('Real-time price update error:', err)
    }
  }, [portfolioData])

  const refreshPortfolio = useCallback(async () => {
    await fetchPortfolioData()
  }, [fetchPortfolioData])

  const clearCache = useCallback(() => {
    portfolioService.clearCache()
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchPortfolioData()
  }, [fetchPortfolioData])

  // Set up auto-refresh for portfolio data
  useEffect(() => {
    if (!autoRefresh) return

    intervalRef.current = setInterval(() => {
      fetchPortfolioData()
    }, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, fetchPortfolioData])

  // Set up real-time price updates (more frequent)
  useEffect(() => {
    if (!autoRefresh || !portfolioData) return

    // Update prices every 15 seconds
    priceIntervalRef.current = setInterval(() => {
      updateRealTimePrices()
    }, 15000)

    // Initial price update
    updateRealTimePrices()

    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current)
      }
    }
  }, [autoRefresh, portfolioData, updateRealTimePrices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current)
      }
    }
  }, [])

  return {
    portfolioData,
    allocation,
    isLoading,
    error,
    realTimeValues,
    refreshPortfolio,
    clearCache
  }
}
