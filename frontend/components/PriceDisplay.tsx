'use client'

import { useSimpleBTCPriceAPI } from '@/hooks/useSimpleBTCPriceAPI'
import { TrendingUp, TrendingDown, Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface PriceDisplayProps {
  symbol?: string
  showChange?: boolean
  showStatus?: boolean
  className?: string
}

export default function PriceDisplay({ 
  symbol = 'BTCUSDT', 
  showChange = true, 
  showStatus = true,
  className = '' 
}: PriceDisplayProps) {
  const { price, change24h, isLoading, error, isConnected } = useSimpleBTCPriceAPI()

  const formatPrice = (price: number) => {
    if (price === 0) return '---'
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const formatChange = (change: number) => {
    if (change === 0) return '0.00%'
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="w-3 h-3 text-red-500" />
    } else if (isLoading) {
      return <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
    } else if (isConnected) {
      return <Wifi className="w-3 h-3 text-green-500" />
    } else {
      return <WifiOff className="w-3 h-3 text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (error) {
      return '오류'
    } else if (isLoading) {
      return '로딩 중'
    } else if (isConnected) {
      return 'API 연결됨'
    } else {
      return '연결 끊김'
    }
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* 가격 표시 */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-white">
            ${formatPrice(price)}
          </span>
          {showStatus && (
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span className="text-xs text-gray-400">{getStatusText()}</span>
            </div>
          )}
        </div>
        
        {showChange && change24h !== 0 && (
          <div className={`flex items-center space-x-1 text-sm ${
            change24h > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {change24h > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{formatChange(change24h)}</span>
          </div>
        )}
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">가격 로딩 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}