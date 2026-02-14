'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import { tradingApi } from '@/utils/api'

interface Trade {
  orderId: string
  symbol: string
  side: string
  orderType: string
  qty: string
  price: string
  execTime: string
  execQty: string
  execPrice: string
  orderStatus: string
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTradeHistory()
    
    // 30초마다 거래 내역 업데이트
    const interval = setInterval(fetchTradeHistory, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchTradeHistory = async () => {
    try {
      const response = await tradingApi.getTradeHistory()
      setTrades(response.trades || [])
    } catch (error) {
      console.error('거래 내역 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Filled':
        return 'text-crypto-green'
      case 'PartiallyFilled':
        return 'text-yellow-400'
      case 'Cancelled':
        return 'text-crypto-red'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Filled':
        return '체결완료'
      case 'PartiallyFilled':
        return '부분체결'
      case 'Cancelled':
        return '취소됨'
      case 'New':
        return '대기중'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-gray-400">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p>거래 내역이 없습니다</p>
        <p className="text-sm mt-2">API 키 설정 후 실제 거래를 시작해보세요!</p>
        <div className="mt-3 px-3 py-1 bg-red-600 text-white text-xs rounded">
          LIVE TRADING MODE
        </div>
      </div>
    )
  }

  return (
    <div className="h-80 overflow-y-auto">
      <div className="space-y-3">
        {trades.map((trade, index) => (
          <div
            key={trade.orderId || index}
            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {/* 거래 방향 아이콘 */}
              <div className={`p-2 rounded-full ${
                trade.side === 'Buy' 
                  ? 'bg-crypto-green/20 text-crypto-green' 
                  : 'bg-crypto-red/20 text-crypto-red'
              }`}>
                {trade.side === 'Buy' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>

              {/* 거래 정보 */}
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${
                    trade.side === 'Buy' ? 'text-crypto-green' : 'text-crypto-red'
                  }`}>
                    {trade.side === 'Buy' ? '매수' : '매도'}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {trade.symbol || 'BTCUSDT'}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {formatTime(trade.execTime)}
                </div>
              </div>
            </div>

            {/* 거래 상세 */}
            <div className="text-right">
              <div className="font-medium">
                {parseFloat(trade.execQty || trade.qty).toFixed(6)} BTC
              </div>
              <div className="text-sm text-gray-400">
                ${parseFloat(trade.execPrice || trade.price).toLocaleString()}
              </div>
              <div className={`text-xs ${getStatusColor(trade.orderStatus)}`}>
                {getStatusText(trade.orderStatus)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 더 보기 버튼 */}
      <div className="mt-4 text-center">
        <button 
          onClick={fetchTradeHistory}
          className="text-crypto-blue hover:text-crypto-blue/80 text-sm transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}