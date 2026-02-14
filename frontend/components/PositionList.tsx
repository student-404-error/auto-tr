'use client'

import { useState, useEffect } from 'react'
import { tradingApi } from '@/utils/api'
import { Target, TrendingUp, TrendingDown, X, ExternalLink } from 'lucide-react'

interface Position {
  id: string
  symbol: string
  position_type: 'long' | 'short'
  entry_price: number
  quantity: number
  dollar_amount: number
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_percent: number
  open_time: string
  status: 'open' | 'closed'
  days_open?: number
}

interface PositionListProps {
  symbol?: string
  maxItems?: number
  showCloseButton?: boolean
  compact?: boolean
  onPositionClick?: (position: Position) => void
}

export default function PositionList({ 
  symbol, 
  maxItems = 10, 
  showCloseButton = false,
  compact = false,
  onPositionClick 
}: PositionListProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchPositions()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPositions, 30000)
    return () => clearInterval(interval)
  }, [symbol])

  const fetchPositions = async () => {
    try {
      const response = await tradingApi.getOpenPositions(symbol)
      setPositions(response.positions?.slice(0, maxItems) || [])
    } catch (error) {
      console.error('Failed to fetch positions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClosePosition = async (positionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    try {
      setIsUpdating(true)
      
      const result = await tradingApi.closePosition(positionId)
      
      if (result.success) {
        await fetchPositions()
        alert(`Position closed! P&L: ${result.message}`)
      } else {
        alert(`Failed to close position: ${result.error}`)
      }
      
    } catch (error) {
      console.error('Failed to close position:', error)
      alert('Failed to close position')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No open positions</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {positions.map(position => (
        <div
          key={position.id}
          onClick={() => onPositionClick?.(position)}
          className={`bg-gray-800 rounded-lg p-4 transition-colors ${
            onPositionClick ? 'cursor-pointer hover:bg-gray-750' : ''
          } ${compact ? 'p-3' : 'p-4'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
                {position.symbol}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                position.position_type === 'long' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}>
                {position.position_type.toUpperCase()}
              </span>
              {!compact && position.days_open !== undefined && (
                <span className="text-xs text-gray-400">
                  {position.days_open}d
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className={`font-bold ${compact ? 'text-sm' : 'text-base'} ${getPnLColor(position.unrealized_pnl)}`}>
                  {position.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(position.unrealized_pnl)}
                </div>
                <div className={`text-xs ${getPnLColor(position.unrealized_pnl)}`}>
                  {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                </div>
              </div>
              
              {showCloseButton && (
                <button
                  onClick={(e) => handleClosePosition(position.id, e)}
                  disabled={isUpdating}
                  className="p-1 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                  title="Close Position"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              
              {onPositionClick && (
                <ExternalLink className="w-3 h-3 text-gray-400" />
              )}
            </div>
          </div>

          {!compact && (
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <div>
                <span className="block">Entry: {formatCurrency(position.entry_price)}</span>
              </div>
              <div>
                <span className="block">Current: {formatCurrency(position.current_price)}</span>
              </div>
              <div>
                <span className="block">Qty: {position.quantity.toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}