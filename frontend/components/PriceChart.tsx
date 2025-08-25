'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { tradingApi } from '@/utils/api'

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export default function PriceChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('1') // 1분봉

  useEffect(() => {
    fetchChartData()
    
    // 1분마다 차트 데이터 업데이트
    const interval = setInterval(fetchChartData, 60000)
    return () => clearInterval(interval)
  }, [timeframe])

  const fetchChartData = async () => {
    try {
      const response = await tradingApi.getChartData('BTCUSDT', timeframe, 100)
      const formattedData = response.data.map((item: ChartData) => ({
        ...item,
        time: new Date(item.timestamp).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
      setChartData(formattedData.reverse()) // 최신 데이터가 오른쪽에 오도록
    } catch (error) {
      console.error('차트 데이터 조회 실패:', error)
    } finally {
      setIsLoading(false)
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

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div>
      {/* 시간대 선택 */}
      <div className="flex space-x-2 mb-4">
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

      {/* 차트 */}
      <div className="h-80">
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
              tickFormatter={(value) => `$${value.toLocaleString()}`}
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
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 차트 정보 */}
      <div className="mt-4 flex justify-between text-sm text-gray-400">
        <span>BTC/USDT {timeframe}분봉</span>
        <span>마지막 업데이트: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}