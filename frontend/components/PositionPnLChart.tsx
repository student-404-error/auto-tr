'use client'

import { useState, useEffect } from 'react'
import { tradingApi } from '@/utils/api'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

interface Position {
  id: string
  symbol: string
  position_type: 'long' | 'short'
  unrealized_pnl: number
  unrealized_pnl_percent: number
  dollar_amount: number
  days_open?: number
}

interface PnLData {
  totalPnL: number
  totalInvested: number
  totalPnLPercent: number
  positionsBySymbol: Record<string, {
    positions: Position[]
    totalPnL: number
    totalInvested: number
    count: number
  }>
}

export default function PositionPnLChart() {
  const [pnlData, setPnlData] = useState<PnLData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all')

  useEffect(() => {
    fetchPnLData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPnLData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchPnLData = async () => {
    try {
      const response = await tradingApi.getOpenPositions()
      const positions: Position[] = response.positions || []
      
      // Calculate aggregated P&L data
      const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0)
      const totalInvested = positions.reduce((sum, pos) => sum + pos.dollar_amount, 0)
      const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0
      
      // Group by symbol
      const positionsBySymbol: Record<string, any> = {}
      positions.forEach(position => {
        if (!positionsBySymbol[position.symbol]) {
          positionsBySymbol[position.symbol] = {
            positions: [],
            totalPnL: 0,
            totalInvested: 0,
            count: 0
          }
        }
        
        const symbolData = positionsBySymbol[position.symbol]
        symbolData.positions.push(position)
        symbolData.totalPnL += position.unrealized_pnl
        symbolData.totalInvested += position.dollar_amount
        symbolData.count += 1
      })
      
      setPnlData({
        totalPnL,
        totalInvested,
        totalPnLPercent,
        positionsBySymbol
      })
      
    } catch (error) {
      console.error('Failed to fetch P&L data:', error)
    } finally {
      setIsLoading(false)
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

  const getBarColor = (pnl: number) => {
    return pnl >= 0 ? 'bg-crypto-green' : 'bg-crypto-red'
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!pnlData || Object.keys(pnlData.positionsBySymbol).length === 0) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="w-5 h-5 text-crypto-blue" />
          <h3 className="text-lg font-semibold">Position P&L</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No positions to display</p>
        </div>
      </div>
    )
  }

  const symbols = Object.keys(pnlData.positionsBySymbol)
  const maxAbsPnL = Math.max(
    ...symbols.map(symbol => Math.abs(pnlData.positionsBySymbol[symbol].totalPnL))
  )

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-crypto-blue" />
          <h3 className="text-lg font-semibold">Position P&L Visualization</h3>
        </div>
        
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
        >
          <option value="all">All Symbols</option>
          {symbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
        </select>
      </div>

      {/* Total P&L Summary */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${getPnLColor(pnlData.totalPnL)}`}>
              {pnlData.totalPnL >= 0 ? '+' : ''}{formatCurrency(pnlData.totalPnL)}
            </div>
            <div className="text-sm text-gray-400">Total P&L</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${getPnLColor(pnlData.totalPnL)}`}>
              {pnlData.totalPnLPercent >= 0 ? '+' : ''}{pnlData.totalPnLPercent.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-400">Total Return</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-300">
              {formatCurrency(pnlData.totalInvested)}
            </div>
            <div className="text-sm text-gray-400">Total Invested</div>
          </div>
        </div>
      </div>

      {/* P&L by Symbol */}
      <div className="space-y-4">
        {symbols
          .filter(symbol => selectedSymbol === 'all' || symbol === selectedSymbol)
          .sort((a, b) => pnlData.positionsBySymbol[b].totalPnL - pnlData.positionsBySymbol[a].totalPnL)
          .map(symbol => {
            const symbolData = pnlData.positionsBySymbol[symbol]
            const pnlPercent = symbolData.totalInvested > 0 
              ? (symbolData.totalPnL / symbolData.totalInvested) * 100 
              : 0
            const barWidth = maxAbsPnL > 0 
              ? Math.abs(symbolData.totalPnL) / maxAbsPnL * 100 
              : 0

            return (
              <div key={symbol} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-lg">{symbol}</span>
                    <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs">
                      {symbolData.count} position{symbolData.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getPnLColor(symbolData.totalPnL)}`}>
                      {symbolData.totalPnL >= 0 ? '+' : ''}{formatCurrency(symbolData.totalPnL)}
                    </div>
                    <div className={`text-sm ${getPnLColor(symbolData.totalPnL)}`}>
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* P&L Bar */}
                <div className="relative h-2 bg-gray-700 rounded-full mb-3">
                  <div
                    className={`absolute top-0 left-1/2 h-full rounded-full transition-all duration-300 ${
                      getBarColor(symbolData.totalPnL)
                    }`}
                    style={{
                      width: `${barWidth}%`,
                      transform: symbolData.totalPnL >= 0 
                        ? 'translateX(0)' 
                        : `translateX(-${barWidth}%)`
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Invested: </span>
                    <span className="font-medium">{formatCurrency(symbolData.totalInvested)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Current Value: </span>
                    <span className="font-medium">
                      {formatCurrency(symbolData.totalInvested + symbolData.totalPnL)}
                    </span>
                  </div>
                </div>

                {/* Individual Positions */}
                {selectedSymbol !== 'all' && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Individual Positions:</div>
                    <div className="space-y-2">
                      {symbolData.positions.map((position: Position) => (
                        <div key={position.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              position.position_type === 'long' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-red-600 text-white'
                            }`}>
                              {position.position_type.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400">
                              {position.days_open || 0}d
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getPnLColor(position.unrealized_pnl)}`}>
                              {position.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(position.unrealized_pnl)}
                            </div>
                            <div className={`text-xs ${getPnLColor(position.unrealized_pnl)}`}>
                              {position.unrealized_pnl_percent >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}