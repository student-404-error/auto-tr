'use client'

import { Wifi, WifiOff, Activity, Pause } from 'lucide-react'

interface StatusIndicatorProps {
  isConnected: boolean
  tradingActive: boolean
  currentPrice: number | null
}

export default function StatusIndicator({ 
  isConnected, 
  tradingActive, 
  currentPrice 
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-dark-card rounded-lg border border-red-500">
      <div className="flex items-center space-x-6">
        {/* 실제 거래 모드 표시 */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-red-400">
            LIVE TRADING MODE
          </span>
        </div>

        {/* 연결 상태 */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-crypto-green" />
          ) : (
            <WifiOff className="w-4 h-4 text-crypto-red" />
          )}
          <span className={`text-sm ${isConnected ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {isConnected ? 'API 연결됨' : 'API 연결 끊김'}
          </span>
        </div>

        {/* 트레이딩 상태 */}
        <div className="flex items-center space-x-2">
          {tradingActive ? (
            <Activity className="w-4 h-4 text-crypto-blue animate-pulse" />
          ) : (
            <Pause className="w-4 h-4 text-gray-400" />
          )}
          <span
            className={`text-sm font-medium ${
              tradingActive ? 'text-crypto-blue' : 'text-gray-300'
            }`}
          >
            {tradingActive ? '자동매매 실행 중' : '자동매매 중지됨'}
          </span>
        </div>

        {/* 현재 BTC 가격 */}
        {currentPrice && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">BTC:</span>
            <span className="text-sm font-medium text-crypto-blue">
              ${currentPrice.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* 현재 시간 */}
      <div className="text-sm text-gray-400">
        {new Date().toLocaleTimeString('ko-KR')}
      </div>
    </div>
  )
}
