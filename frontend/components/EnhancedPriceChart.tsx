'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts'
import { tradingApi } from '@/utils/api'

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  time?: string
}

interface TradeMarker {
  id: string
  timestamp: string
  price: number
  type: string
  side: 'buy' | 'sell'
  position_type: 'long' | 'short' | 'spot'
  quantity: number
  dollar_amount: number
  signal?: string
  fees: number
}

interface EnhancedPriceChartProps {
  symbol?: string
  showMarkers?: boolean
}

export default function EnhancedPriceChart({ 
  symbol = 'BTCUSDT', 
  showMarkers = true 
}: EnhancedPriceChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('1')
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [pnlData, setPnlData] = useState<{
    unrealized_pnl: number
    unrealized_pnl_percent: number
    total_invested: number
    current_value: number
  } | null>(null)

  useEffect(() => {
    fetchChartData()
    if (showMarkers) {
      fetchTradeMarkers()
    }
    fetchPnLData()
    
    // Update chart data every minute
    const interval = setInterval(() => {
      fetchChartData()
      fetchCurrentPrice()
      fetchPnLData()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [timeframe, symbol, showMarkers])

  const fetchChartData = async () => {
    try {
      const response = await tradingApi.getChartData(symbol, timeframe, 100)
      const formattedData = response.data.map((item: ChartData) => ({
        ...item,
        time: new Date(item.timestamp).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
      setChartData(formattedData.reverse())
    } catch (error) {
      console.error('차트 데이터 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTradeMarkers = async () => {
    try {
      const response = await tradingApi.getTradeMarkers(symbol)
      setTradeMarkers(response.markers || [])
    } catch (error) {
      console.error('거래 마커 조회 실패:', error)
    }
  }

  const fetchCurrentPrice = async () => {
    try {
      const response = await tradingApi.getCurrentPrice(symbol)
      setCurrentPrice(response.price)
    } catch (error) {
      console.error('현재 가격 조회 실패:', error)
    }
  }

  const fetchPnLData = async () => {
    try {
      const response = await tradingApi.getPnL(symbol)
      setPnlData(response)
    } catch (error) {
      console.error('P&L 데이터 조회 실패:', error)
    }
  }

  // Convert trade markers to chart coordinates
  const getMarkersForChart = () => {
    if (!showMarkers || !tradeMarkers.length || !chartData.length) return []

    return tradeMarkers.map(marker => {
      const markerTime = new Date(marker.timestamp).getTime()
      
      // Find the closest chart data point
      const closestDataPoint = chartData.reduce((closest, current) => {
        const currentDiff = Math.abs(current.timestamp - markerTime)
        const closestDiff = Math.abs(closest.timestamp - markerTime)
        return currentDiff < closestDiff ? current : closest
      })

      return {
        ...marker,
        x: closestDataPoint.time,
        y: marker.price,
        chartTimestamp: closestDataPoint.timestamp
      }
    }).filter(marker => {
      // Only show markers that are within the chart timeframe
      const chartStartTime = Math.min(...chartData.map(d => d.timestamp))
      const chartEndTime = Math.max(...chartData.map(d => d.timestamp))
      const markerTime = new Date(marker.timestamp).getTime()
      return markerTime >= chartStartTime && markerTime <= chartEndTime
    })
  }

  const getMarkerColor = (marker: TradeMarker) => {
    if (marker.side === 'buy') {
      return marker.position_type === 'long' ? '#00D4AA' : '#00A3FF'
    } else {
      return marker.position_type === 'short' ? '#FF6B6B' : '#FF9500'
    }
  }

  const getMarkerSymbol = (marker: TradeMarker) => {
    if (marker.side === 'buy') {
      return marker.position_type === 'long' ? 'triangle' : 'triangleUp'
    } else {
      return marker.position_type === 'short' ? 'triangleDown' : 'triangle'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-dark-card p-3 rounded-lg border border-gray-600 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="text-crypto-green">시가: ${data.open.toLocaleString()}</p>
            <p className="text-crypto-blue">고가: ${data.high.toLocaleString()}</p>
            <p className="text-crypto-red">저가: ${data.low.toLocaleString()}</p>
            <p className="text-white font-medium">종가: ${data.close.toLocaleString()}</p>
            <p className="text-gray-400">거래량: {data.volume.toFixed(4)}</p>
          </div>
        </div>
      )
    }
    return null
  }

  const MarkerTooltip = ({ marker }: { marker: TradeMarker }) => (
    <div className="bg-dark-card p-3 rounded-lg border border-gray-600 shadow-lg max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: getMarkerColor(marker) }}
        />
        <span className="text-white font-medium text-sm">
          {marker.side.toUpperCase()} {marker.position_type.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1 text-xs">
        <p className="text-gray-300">
          시간: {new Date(marker.timestamp).toLocaleString('ko-KR')}
        </p>
        <p className="text-white">가격: ${marker.price.toLocaleString()}</p>
        <p className="text-gray-300">수량: {marker.quantity.toFixed(6)}</p>
        <p className="text-gray-300">금액: ${marker.dollar_amount.toFixed(2)}</p>
        {marker.signal && (
          <p className="text-crypto-blue">신호: {marker.signal}</p>
        )}
        {marker.fees > 0 && (
          <p className="text-gray-400">수수료: ${marker.fees.toFixed(4)}</p>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  const chartMarkers = getMarkersForChart()

  return (
    <div>
      {/* P&L 인디케이터 */}
      {pnlData && pnlData.total_invested > 0 && (
        <div className="mb-4 p-3 bg-dark-card rounded-lg border border-gray-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-400">현재 가치: </span>
                <span className="text-white font-medium">
                  ${pnlData.current_value.toLocaleString()}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">투자 금액: </span>
                <span className="text-white font-medium">
                  ${pnlData.total_invested.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${
                pnlData.unrealized_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'
              }`}>
                {pnlData.unrealized_pnl >= 0 ? '+' : ''}${pnlData.unrealized_pnl.toFixed(2)}
              </div>
              <div className={`text-sm px-2 py-1 rounded ${
                pnlData.unrealized_pnl >= 0 
                  ? 'bg-crypto-green bg-opacity-20 text-crypto-green' 
                  : 'bg-crypto-red bg-opacity-20 text-crypto-red'
              }`}>
                {pnlData.unrealized_pnl >= 0 ? '+' : ''}{pnlData.unrealized_pnl_percent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시간대 선택 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          {[
            { value: '1', label: '1분' },
            { value: '5', label: '5분' },
            { value: '15', label: '15분' },
            { value: '60', label: '1시간' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeframe === option.value
                  ? 'bg-crypto-blue text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {showMarkers && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-crypto-green rounded-full"></div>
              <span className="text-gray-400">매수 롱</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-400">매수 숏</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-gray-400">매도 숏</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-gray-400">매도</span>
            </div>
          </div>
        )}
      </div>

      {/* 차트 */}
      <div className="h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              domain={['dataMin - 100', 'dataMax + 100']}
              tickFormatter={(value) => `${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#00D4AA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#00D4AA', strokeWidth: 2 }}
            />
            
            {/* Average Price Reference Line */}
            {pnlData && pnlData.total_invested > 0 && (
              <ReferenceLine
                y={pnlData.total_invested / (pnlData.current_value / currentPrice)}
                stroke="#FFA500"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ 
                  value: "평균 매수가", 
                  position: "top" as const,
                  style: { fill: '#FFA500', fontSize: '12px' }
                }}
              />
            )}
            
            {/* Current Price Reference Line */}
            {currentPrice > 0 && (
              <ReferenceLine
                y={currentPrice}
                stroke={pnlData && pnlData.unrealized_pnl >= 0 ? "#00D4AA" : "#FF6B6B"}
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ 
                  value: `현재가: $${currentPrice.toLocaleString()}`, 
                  position: "top" as const,
                  style: { 
                    fill: pnlData && pnlData.unrealized_pnl >= 0 ? "#00D4AA" : "#FF6B6B", 
                    fontSize: '12px' 
                  }
                }}
              />
            )}

            {/* Trade Markers */}
            {showMarkers && chartMarkers.map((marker, index) => (
              <ReferenceDot
                key={`${marker.id}-${index}`}
                x={marker.x}
                y={marker.y}
                r={6}
                fill={getMarkerColor(marker)}
                stroke="#ffffff"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Marker tooltips on hover */}
        {showMarkers && chartMarkers.length > 0 && (
          <div className="absolute top-2 right-2 text-xs text-gray-400">
            {chartMarkers.length}개 거래 표시됨
          </div>
        )}
      </div>

      {/* 차트 정보 */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{symbol} {timeframe}분봉</span>
          {currentPrice > 0 && (
            <span className="text-white">
              현재가: ${currentPrice.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {pnlData && pnlData.total_invested > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">실시간 P&L:</span>
              <span className={`font-medium ${
                pnlData.unrealized_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'
              }`}>
                {pnlData.unrealized_pnl >= 0 ? '+' : ''}${pnlData.unrealized_pnl.toFixed(2)}
                ({pnlData.unrealized_pnl >= 0 ? '+' : ''}{pnlData.unrealized_pnl_percent.toFixed(2)}%)
              </span>
            </div>
          )}
          <span className="text-gray-400">
            마지막 업데이트: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}