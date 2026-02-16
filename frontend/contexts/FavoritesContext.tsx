'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export interface CryptoCurrency {
  symbol: string
  name: string
  displaySymbol: string // For display purposes (e.g., "BTC", "XRP", "SOL")
  tradingPair: string // For API calls (e.g., "BTCUSDT", "XRPUSDT", "SOLUSDT")
}

export interface PriceData {
  price: number
  change24h: number
  changePercent24h: number
  timestamp: number
}

export interface FavoritePriceData extends CryptoCurrency {
  priceData: PriceData | null
  isLoading: boolean
  error: string | null
}

interface FavoritesContextType {
  availableCryptos: CryptoCurrency[]
  favorites: string[]
  favoritePrices: Record<string, FavoritePriceData>
  addToFavorites: (symbol: string) => void
  removeFromFavorites: (symbol: string) => void
  isFavorite: (symbol: string) => boolean
  refreshPrices: () => Promise<void>
}

// Available cryptocurrencies based on the requirements
const AVAILABLE_CRYPTOS: CryptoCurrency[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    displaySymbol: 'BTC',
    tradingPair: 'BTCUSDT'
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    displaySymbol: 'XRP',
    tradingPair: 'XRPUSDT'
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    displaySymbol: 'SOL',
    tradingPair: 'SOLUSDT'
  }
]

const FAVORITES_STORAGE_KEY = 'trading-dashboard-favorites'
const DEFAULT_FAVORITES = ['BTC'] // BTC is favorite by default

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES)
  const [favoritePrices, setFavoritePrices] = useState<Record<string, FavoritePriceData>>({})

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (stored) {
      try {
        const parsedFavorites = JSON.parse(stored)
        if (Array.isArray(parsedFavorites)) {
          setFavorites(parsedFavorites)
        }
      } catch (error) {
        console.error('Failed to parse stored favorites:', error)
      }
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  // Initialize favorite prices data structure
  useEffect(() => {
    const initialPrices: Record<string, FavoritePriceData> = {}
    
    favorites.forEach(symbol => {
      const crypto = AVAILABLE_CRYPTOS.find(c => c.symbol === symbol)
      if (crypto) {
        initialPrices[symbol] = {
          ...crypto,
          priceData: null,
          isLoading: true,
          error: null
        }
      }
    })
    
    setFavoritePrices(initialPrices)
  }, [favorites])

  const fetchPriceForSymbol = async (crypto: CryptoCurrency): Promise<PriceData | null> => {
    try {
      const response = await fetch(`https://api.dataquantlab.com/api/price/${crypto.tradingPair}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        price: data.price || 0,
        change24h: data.change_24h || 0,
        changePercent24h: data.change_percent_24h || 0,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error(`Failed to fetch price for ${crypto.symbol}:`, error)
      return null
    }
  }

  const refreshPrices = useCallback(async () => {
    const updates: Record<string, Partial<FavoritePriceData>> = {}
    
    // Set loading state for all favorites
    favorites.forEach(symbol => {
      updates[symbol] = { isLoading: true, error: null }
    })
    
    setFavoritePrices(prev => {
      const updated = { ...prev }
      Object.keys(updates).forEach(symbol => {
        if (updated[symbol]) {
          updated[symbol] = { ...updated[symbol], ...updates[symbol] }
        }
      })
      return updated
    })

    // Fetch prices for all favorites
    const pricePromises = favorites.map(async (symbol) => {
      const crypto = AVAILABLE_CRYPTOS.find(c => c.symbol === symbol)
      if (!crypto) return { symbol, priceData: null, error: 'Cryptocurrency not found' }

      try {
        const priceData = await fetchPriceForSymbol(crypto)
        return { symbol, priceData, error: null }
      } catch (error) {
        return { symbol, priceData: null, error: 'Failed to fetch price' }
      }
    })

    const results = await Promise.allSettled(pricePromises)
    
    // Update state with results
    setFavoritePrices(prev => {
      const updated = { ...prev }
      
      results.forEach((result, index) => {
        const symbol = favorites[index]
        if (result.status === 'fulfilled' && updated[symbol]) {
          updated[symbol] = {
            ...updated[symbol],
            priceData: result.value.priceData,
            isLoading: false,
            error: result.value.error
          }
        } else if (result.status === 'rejected' && updated[symbol]) {
          updated[symbol] = {
            ...updated[symbol],
            priceData: null,
            isLoading: false,
            error: 'Failed to fetch price'
          }
        }
      })
      
      return updated
    })
  }, [favorites])

  // Auto-refresh prices every 5 seconds
  useEffect(() => {
    if (favorites.length === 0) return

    // Initial fetch
    refreshPrices()

    // Set up interval for auto-refresh
    const interval = setInterval(refreshPrices, 5000)

    return () => clearInterval(interval)
  }, [favorites, refreshPrices])

  const addToFavorites = useCallback((symbol: string) => {
    const crypto = AVAILABLE_CRYPTOS.find(c => c.symbol === symbol)
    if (!crypto) {
      console.error(`Cryptocurrency ${symbol} not found in available cryptos`)
      return
    }

    setFavorites(prev => {
      if (prev.includes(symbol)) return prev
      return [...prev, symbol]
    })
  }, [])

  const removeFromFavorites = useCallback((symbol: string) => {
    setFavorites(prev => prev.filter(fav => fav !== symbol))
    setFavoritePrices(prev => {
      const updated = { ...prev }
      delete updated[symbol]
      return updated
    })
  }, [])

  const isFavorite = useCallback((symbol: string) => {
    return favorites.includes(symbol)
  }, [favorites])

  const value: FavoritesContextType = {
    availableCryptos: AVAILABLE_CRYPTOS,
    favorites,
    favoritePrices,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    refreshPrices
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}