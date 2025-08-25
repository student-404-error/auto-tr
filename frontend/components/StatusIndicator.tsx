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
    <div className="flex items-center justify-between p-4 bg-dark-card rounded-lg border border-gray-700">
      <div className="flex items-center space-x-6">
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
          <span className={`text-sm ${tradingActive ? 'text-crypto-blue' : 'text-gray-400'}`}>
            {tradingActive ? '자동매매 실행 중' : '자동매매 중지'}
          </span>
        </div>
      </div>

      {/* 현재 시간 */}
      <div className="text-sm text-gray-400">
        {new Date().toLocaleTimeString('ko-KR')}
      </div>
    </div>
  )
}