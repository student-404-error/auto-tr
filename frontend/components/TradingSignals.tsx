'use client'

import { useState, useEffect } from 'react'
import { tradingApi } from '@/utils/api'
import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react'

interface Signal {
  id: string
  timestamp: string
  symbol: string
  side: string
  quantity: number
  price: number
  signal: string
}

export default function TradingSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSignals()

    // 30초마다 신호 업데이트
    const interval = setInterval(fetchSignals, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSignals = async () => {
    try {
      const response = await tradingApi.getRecentSignals()
      setSignals(response.signals)
    } catch (error) {
      console.error('신호 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSignalIcon = (signal: string, side: string) => {
    if (side === 'Buy') {
      return <TrendingUp className="w-4 h-4 text-crypto-green" />
    } else {
      return <TrendingDown className="w-4 h-4 text-crypto-red" />
    }
  }

  const getSignalText = (signal: string) => {
    switch (signal) {
      case 'buy':
        return '매수 신호'
      case 'sell':
        return '매도 신호'
      case 'rsi_oversold':
        return 'RSI 과매도'
      case 'rsi_overbought':
        return 'RSI 과매수'
      case 'ma_crossover':
        return 'MA 골든크로스'
      case 'ma_crossunder':
        return 'MA 데드크로스'
      default:
        return signal
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="w-5 h-5 text-crypto-blue" />
        <h3 className="text-lg font-semibold">실시간 거래 신호</h3>
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          <div className="w-2 h-2 bg-crypto-green rounded-full animate-pulse"></div>
          <span>실시간</span>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>최근 거래 신호가 없습니다</p>
          <p className="text-sm mt-2">자동매매가 활성화되면 신호가 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {signals.map((signal, index) => (
            <div
              key={signal.id || index}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {/* 신호 아이콘 */}
                <div className={`p-2 rounded-full ${signal.side === 'Buy'
                  ? 'bg-crypto-green/20'
                  : 'bg-crypto-red/20'
                  }`}>
                  {getSignalIcon(signal.signal, signal.side)}
                </div>

                {/* 신호 정보 */}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${signal.side === 'Buy' ? 'text-crypto-green' : 'text-crypto-red'
                      }`}>
                      {getSignalText(signal.signal)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {signal.symbol}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTime(signal.timestamp)}
                  </div>
                </div>
              </div>

              {/* 거래 상세 */}
              <div className="text-right">
                <div className="font-medium">
                  {signal.quantity.toFixed(6)} BTC
                </div>
                <div className="text-sm text-gray-400">
                  ${signal.price.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div className="mt-4 text-center">
        <button
          onClick={fetchSignals}
          className="text-crypto-blue hover:text-crypto-blue/80 text-sm transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}