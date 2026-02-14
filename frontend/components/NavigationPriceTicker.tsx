'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, Settings } from 'lucide-react'
import { useFavorites } from '@/contexts/FavoritesContext'

interface NavigationPriceTickerProps {
  onPriceClick?: (symbol: string) => void
  onSettingsClick?: () => void
}

export default function NavigationPriceTicker({ 
  onPriceClick, 
  onSettingsClick 
}: NavigationPriceTickerProps) {
  const { favorites, favoritePrices } = useFavorites()

  const formatPrice = (price: number, symbol: string): string => {
    // Format price based on typical ranges for each crypto
    if (symbol === 'BTC') {
      return price.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })
    } else if (symbol === 'XRP') {
      return price.toFixed(4)
    } else if (symbol === 'SOL') {
      return price.toFixed(2)
    }
    return price.toFixed(2)
  }

  const formatChange = (change: number): string => {
    const absChange = Math.abs(change)
    if (absChange >= 1) {
      return absChange.toFixed(2)
    } else {
      return absChange.toFixed(4)
    }
  }

  const getChangeIcon = (changePercent: number) => {
    if (changePercent > 0) {
      return <TrendingUp className="w-3 h-3" />
    } else if (changePercent < 0) {
      return <TrendingDown className="w-3 h-3" />
    } else {
      return <Minus className="w-3 h-3" />
    }
  }

  const getChangeColor = (changePercent: number): string => {
    if (changePercent > 0) {
      return 'text-crypto-green'
    } else if (changePercent < 0) {
      return 'text-crypto-red'
    } else {
      return 'text-gray-400'
    }
  }

  if (favorites.length === 0) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-400">즐겨찾기 없음</span>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="즐겨찾기 설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-6">
      {favorites.map((symbol) => {
        const favoriteData = favoritePrices[symbol]
        
        if (!favoriteData) return null

        const { priceData, isLoading, error } = favoriteData
        
        return (
          <div
            key={symbol}
            onClick={() => onPriceClick?.(symbol)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              onPriceClick ? 'cursor-pointer hover:bg-gray-700' : ''
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-300">
                {favoriteData.displaySymbol}
              </span>
              
              {isLoading ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">로딩중...</span>
                </div>
              ) : error ? (
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-crypto-red">오류</span>
                </div>
              ) : priceData ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono">
                    ${formatPrice(priceData.price, symbol)}
                  </span>
                  
                  <div className={`flex items-center space-x-1 ${getChangeColor(priceData.changePercent24h)}`}>
                    {getChangeIcon(priceData.changePercent24h)}
                    <span className="text-xs font-mono">
                      {priceData.changePercent24h >= 0 ? '+' : ''}
                      {priceData.changePercent24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-gray-400">데이터 없음</span>
              )}
            </div>
          </div>
        )
      })}
      
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="p-1 hover:bg-gray-700 rounded transition-colors ml-2"
          title="즐겨찾기 설정"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}