'use client'

import { useState, useEffect } from 'react'
import { tradingApi } from '@/utils/api'
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  X, 
  RefreshCw, 
  Calendar,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

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
  close_time?: string
  status: 'open' | 'closed'
  entry_trade_id?: string
  exit_trade_id?: string
  current_value?: number
  invested_value?: number
  pnl_color?: string
  days_open?: number
  days_held?: number
  entry_date?: string
  exit_date?: string
  realized_pnl?: number
  realized_pnl_percent?: number
}

interface PositionSummary {
  open_positions_count: number
  closed_positions_count: number
  total_unrealized_pnl: number
  total_invested: number
  realized_pnl: number
  statistics: {
    total_positions: number
    winning_positions: number
    losing_positions: number
    win_rate: number
    avg_holding_days: number
    total_realized_pnl: number
    best_trade: number
    worst_trade: number
  }
  open_positions: Position[]
  recent_closed_positions: Position[]
}

export default function PositionManager() {
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'summary'>('open')
  const [openPositions, setOpenPositions] = useState<Position[]>([])
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [summary, setSummary] = useState<PositionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')

  useEffect(() => {
    fetchAllData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [selectedSymbol])

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      
      const [openRes, closedRes, summaryRes] = await Promise.all([
        tradingApi.getOpenPositions(selectedSymbol || undefined),
        tradingApi.getClosedPositions(selectedSymbol || undefined),
        tradingApi.getPositionsSummary(selectedSymbol || undefined)
      ])
      
      setOpenPositions(openRes.positions || [])
      setClosedPositions(closedRes.positions || [])
      setSummary(summaryRes)
      
    } catch (error) {
      console.error('Failed to fetch position data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClosePosition = async (positionId: string) => {
    try {
      setIsUpdating(true)
      
      // Update prices first
      await tradingApi.updatePositionPrices()
      
      // Close position
      const result = await tradingApi.closePosition(positionId)
      
      if (result.success) {
        // Refresh data
        await fetchAllData()
        alert(`Position closed successfully! P&L: ${result.message}`)
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

  const handleUpdatePrices = async () => {
    try {
      setIsUpdating(true)
      await tradingApi.updatePositionPrices()
      await fetchAllData()
    } catch (error) {
      console.error('Failed to update prices:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPositionTypeColor = (type: string) => {
    return type === 'long' ? 'text-green-400' : 'text-red-400'
  }

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-crypto-blue" />
          <h3 className="text-xl font-semibold">Position Manager</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Symbol Filter */}
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          >
            <option value="">All Symbols</option>
            <option value="BTCUSDT">BTC</option>
            <option value="XRPUSDT">XRP</option>
            <option value="SOLUSDT">SOL</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={handleUpdatePrices}
            disabled={isUpdating}
            className="p-2 bg-crypto-blue hover:bg-blue-600 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
        {[
          { key: 'open', label: 'Open Positions', count: openPositions.length },
          { key: 'closed', label: 'Closed Positions', count: closedPositions.length },
          { key: 'summary', label: 'Summary', count: null }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-crypto-blue text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'open' && (
        <div className="space-y-4">
          {openPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No open positions</p>
              <p className="text-sm mt-2">Open a position to start tracking P&L</p>
            </div>
          ) : (
            openPositions.map(position => (
              <div key={position.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-lg">{position.symbol}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      position.position_type === 'long' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {position.position_type.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {position.days_open || 0} days
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleClosePosition(position.id)}
                    disabled={isUpdating}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                    title="Close Position"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Entry Price</div>
                    <div className="font-medium">{formatCurrency(position.entry_price)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Current Price</div>
                    <div className="font-medium">{formatCurrency(position.current_price)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Quantity</div>
                    <div className="font-medium">{position.quantity.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Invested</div>
                    <div className="font-medium">{formatCurrency(position.dollar_amount)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Opened: {formatDate(position.open_time)}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getPnLColor(position.unrealized_pnl)}`}>
                      {position.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(position.unrealized_pnl)}
                    </div>
                    <div className={`text-sm ${getPnLColor(position.unrealized_pnl)}`}>
                      {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'closed' && (
        <div className="space-y-4">
          {closedPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No closed positions</p>
              <p className="text-sm mt-2">Closed positions will appear here</p>
            </div>
          ) : (
            closedPositions.map(position => (
              <div key={position.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-lg">{position.symbol}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      position.position_type === 'long' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {position.position_type.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs">
                      CLOSED
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getPnLColor(position.realized_pnl || 0)}`}>
                      {(position.realized_pnl || 0) >= 0 ? '+' : ''}{formatCurrency(position.realized_pnl || 0)}
                    </div>
                    <div className={`text-sm ${getPnLColor(position.realized_pnl || 0)}`}>
                      {(position.realized_pnl_percent || 0) >= 0 ? '+' : ''}{(position.realized_pnl_percent || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Entry Price</div>
                    <div className="font-medium">{formatCurrency(position.entry_price)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Exit Price</div>
                    <div className="font-medium">{formatCurrency(position.current_price)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Quantity</div>
                    <div className="font-medium">{position.quantity.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Days Held</div>
                    <div className="font-medium">{position.days_held || 0} days</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-700 text-sm text-gray-400">
                  <div>
                    {formatDate(position.open_time)} → {position.close_time ? formatDate(position.close_time) : 'N/A'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'summary' && summary && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-crypto-blue">{summary.open_positions_count}</div>
              <div className="text-sm text-gray-400">Open Positions</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{summary.closed_positions_count}</div>
              <div className="text-sm text-gray-400">Closed Positions</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${getPnLColor(summary.total_unrealized_pnl)}`}>
                {formatCurrency(summary.total_unrealized_pnl)}
              </div>
              <div className="text-sm text-gray-400">Unrealized P&L</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${getPnLColor(summary.realized_pnl)}`}>
                {formatCurrency(summary.realized_pnl)}
              </div>
              <div className="text-sm text-gray-400">Realized P&L</div>
            </div>
          </div>

          {/* Performance Stats */}
          {summary.statistics && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Performance Statistics
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-crypto-green">
                    {summary.statistics.win_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {summary.statistics.winning_positions}W / {summary.statistics.losing_positions}L
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-300">
                    {summary.statistics.avg_holding_days.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-400">Avg Days</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-crypto-green">
                    {formatCurrency(summary.statistics.best_trade)}
                  </div>
                  <div className="text-sm text-gray-400">Best Trade</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-crypto-red">
                    {formatCurrency(summary.statistics.worst_trade)}
                  </div>
                  <div className="text-sm text-gray-400">Worst Trade</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {summary.recent_closed_positions && summary.recent_closed_positions.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-4">Recent Closed Positions</h4>
              <div className="space-y-2">
                {summary.recent_closed_positions.slice(0, 5).map(position => (
                  <div key={position.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{position.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        position.position_type === 'long' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {position.position_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${getPnLColor(position.realized_pnl || 0)}`}>
                        {(position.realized_pnl || 0) >= 0 ? '+' : ''}{formatCurrency(position.realized_pnl || 0)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {position.exit_date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}