'use client'

import { useState, useEffect } from 'react'
import { tradingApi } from '@/utils/api'
import { Target, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface PositionData {
  unrealized_pnl: number
  unrealized_pnl_percent: number
  average_price: number
  current_price: number
  quantity: number
  invested_value: number
  current_value: number
}

export default function PositionCard() {
  const [position, setPosition] = useState<PositionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPosition()
    
    // 30초마다 포지션 업데이트
    const interval = setInterval(fetchPosition, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchPosition = async () => {
    try {
      const response = await tradingApi.getPnL('BTCUSDT')
      setPosition(response)
    } catch (error) {
      console.error('포지션 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!position || position.quantity <= 0) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="w-5 h-5 text-crypto-blue" />
          <h3 className="text-lg font-semibold">현재 포지션</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>보유 중인 포지션이 없습니다</p>
          <p className="text-sm mt-2">첫 거래를 시작해보세요!</p>
        </div>
      </div>
    )
  }

  const isProfitable = position.unrealized_pnl >= 0

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <Target className="w-5 h-5 text-crypto-blue" />
        <h3 className="text-lg font-semibold">BTC 포지션</h3>
      </div>

      {/* 손익 표시 */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          {isProfitable ? (
            <TrendingUp className="w-4 h-4 text-crypto-green" />
          ) : (
            <TrendingDown className="w-4 h-4 text-crypto-red" />
          )}
          <span className="text-sm text-gray-400">미실현 손익</span>
        </div>
        
        <div className={`text-3xl font-bold ${
          isProfitable ? 'text-crypto-green' : 'text-crypto-red'
        }`}>
          {isProfitable ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
        </div>
        
        <div className={`text-lg ${
          isProfitable ? 'text-crypto-green' : 'text-crypto-red'
        }`}>
          {isProfitable ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
        </div>
      </div>

      {/* 포지션 상세 정보 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
          <span className="text-gray-400">보유량</span>
          <span className="font-medium">{position.quantity.toFixed(6)} BTC</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
          <span className="text-gray-400">평균 매수가</span>
          <span className="font-medium">${position.average_price.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
          <span className="text-gray-400">현재가</span>
          <span className="font-medium">${position.current_price.toLocaleString()}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-800 rounded-lg text-center">
            <div className="text-sm text-gray-400 mb-1">투자금액</div>
            <div className="font-medium">${position.invested_value.toFixed(2)}</div>
          </div>
          
          <div className="p-3 bg-gray-800 rounded-lg text-center">
            <div className="text-sm text-gray-400 mb-1">현재가치</div>
            <div className="font-medium">${position.current_value.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* 가격 변동률 표시 */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">매수가 대비</span>
          <div className={`flex items-center space-x-1 ${
            position.current_price >= position.average_price 
              ? 'text-crypto-green' 
              : 'text-crypto-red'
          }`}>
            {position.current_price >= position.average_price ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-sm font-medium">
              {((position.current_price - position.average_price) / position.average_price * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}