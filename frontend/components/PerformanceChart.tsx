'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { tradingApi } from '@/utils/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PerformanceData {
  timestamp: string
  total_value_usd: number
  btc_price: number
}

interface PurchasePoint {
  timestamp: string
  price: number
  type: 'buy' | 'sell'
}

export default function PerformanceChart() {
  const [data, setData] = useState<PerformanceData[]>([])
  const [purchasePoints, setPurchasePoints] = useState<PurchasePoint[]>([])
  const [period, setPeriod] = useState('7d')
  const [isLoading, setIsLoading] = useState(true)
  const [performance, setPerformance] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // 포트폴리오 히스토리 조회
      const historyResponse = await tradingApi.getPortfolioHistory(period)
      const formattedData = historyResponse.history.map((item: any) => ({
        ...item,
        time: new Date(item.timestamp).toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: period === '1d' ? '2-digit' : undefined,
          minute: period === '1d' ? '2-digit' : undefined
        })
      }))
      
      setData(formattedData)
      
      // 수익률 통계 조회
      const performanceResponse = await tradingApi.getPortfolioPerformance()
      setPerformance(performanceResponse)
      
      // 거래 신호 조회 (구매 지점 표시용)
      const signalsResponse = await tradingApi.getRecentSignals()
      const points = signalsResponse.signals.map((signal: any) => ({
        timestamp: signal.timestamp,
        price: signal.price,
        type: signal.side.toLowerCase()
      }))
      setPurchasePoints(points)
      
    } catch (error) {
      console.error('성과 데이터 조회 실패:', error)
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
          <p className="text-crypto-green font-medium">
            총 자산: ${data.total_value_usd.toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs">
            BTC 가격: ${data.btc_price.toLocaleString()}
          </p>
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
      {/* 수익률 표시 */}
      {performance && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-400">일간 수익률</div>
            <div className={`text-lg font-bold flex items-center justify-center ${
              performance.daily_change >= 0 ? 'text-crypto-green' : 'text-crypto-red'
            }`}>
              {performance.daily_change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {performance.daily_change_percent.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              ${performance.daily_change.toFixed(2)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-400">주간 수익률</div>
            <div className={`text-lg font-bold flex items-center justify-center ${
              performance.weekly_change >= 0 ? 'text-crypto-green' : 'text-crypto-red'
            }`}>
              {performance.weekly_change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {performance.weekly_change_percent.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              ${performance.weekly_change.toFixed(2)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-400">월간 수익률</div>
            <div className={`text-lg font-bold flex items-center justify-center ${
              performance.monthly_change >= 0 ? 'text-crypto-green' : 'text-crypto-red'
            }`}>
              {performance.monthly_change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {performance.monthly_change_percent.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              ${performance.monthly_change.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* 기간 선택 */}
      <div className="flex space-x-2 mb-4">
        {[
          { value: '1d', label: '1일' },
          { value: '7d', label: '1주' },
          { value: '30d', label: '1개월' }
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setPeriod(option.value)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              period === option.value
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
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* 구매 지점 표시 */}
            {purchasePoints.map((point, index) => (
              <ReferenceLine
                key={index}
                x={point.timestamp}
                stroke={point.type === 'buy' ? '#00D4AA' : '#FF6B6B'}
                strokeDasharray="2 2"
              />
            ))}
            
            <Line
              type="monotone"
              dataKey="total_value_usd"
              stroke="#00D4AA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#00D4AA', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="mt-4 flex justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-crypto-green mr-2"></div>
          <span className="text-gray-400">포트폴리오 가치</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-0.5 bg-crypto-green mr-2" style={{borderStyle: 'dashed'}}></div>
          <span className="text-gray-400">매수 지점</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-0.5 bg-crypto-red mr-2" style={{borderStyle: 'dashed'}}></div>
          <span className="text-gray-400">매도 지점</span>
        </div>
      </div>
    </div>
  )
}