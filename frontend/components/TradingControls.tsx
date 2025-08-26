'use client'

import { useState } from 'react'
import { Play, Square, ShoppingCart, TrendingDown, Bot } from 'lucide-react'
import { useTradingContext } from '@/contexts/TradingContext'

export default function TradingControls() {
  const { 
    tradingStatus, 
    isLoading, 
    error,
    startTrading, 
    stopTrading, 
    placeOrder 
  } = useTradingContext()
  
  const [orderAmount, setOrderAmount] = useState('0.001')

  const handleStartTrading = async () => {
    await startTrading()
  }

  const handleStopTrading = async () => {
    await stopTrading()
  }

  const handleBuyOrder = async () => {
    await placeOrder('Buy', orderAmount)
  }

  const handleSellOrder = async () => {
    await placeOrder('Sell', orderAmount)
  }

  const isActive = tradingStatus?.is_active || false

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <Bot className="w-5 h-5 text-crypto-blue" />
        <h3 className="text-lg font-semibold">트레이딩 컨트롤</h3>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 자동매매 상태 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">자동매매 상태</span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isActive 
              ? 'bg-crypto-green/20 text-crypto-green' 
              : 'bg-gray-700 text-gray-400'
          }`}>
            {isActive ? '실행 중' : '중지됨'}
          </div>
        </div>
        
        {tradingStatus && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">포지션:</span>
              <span className={tradingStatus.position ? 'text-crypto-green' : 'text-gray-400'}>
                {tradingStatus.position || '없음'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">마지막 신호:</span>
              <span className="text-gray-300">
                {tradingStatus.last_signal || '없음'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">거래량:</span>
              <span className="text-gray-300">
                {tradingStatus.trade_amount} BTC
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 자동매매 컨트롤 */}
      <div className="mb-6">
        <div className="flex space-x-3">
          <button
            onClick={handleStartTrading}
            disabled={isLoading || isActive}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors ${
              isActive 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'btn-success hover:bg-crypto-green/80'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>자동매매 시작</span>
          </button>
          
          <button
            onClick={handleStopTrading}
            disabled={isLoading || !isActive}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors ${
              !isActive 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'btn-danger hover:bg-crypto-red/80'
            }`}
          >
            <Square className="w-4 h-4" />
            <span>자동매매 중지</span>
          </button>
        </div>
      </div>

      {/* 수동 주문 */}
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-sm font-medium text-gray-400 mb-4">수동 주문</h4>
        
        {/* 실제 거래 경고 */}
        <div className="mb-4 p-3 bg-orange-900/20 border border-orange-500 rounded-lg">
          <p className="text-orange-400 text-xs">
            ⚠️ 실제 자금으로 거래됩니다. 최대 $30 예산 내에서 안전하게 거래됩니다.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">주문량 (BTC)</label>
          <input
            type="number"
            value={orderAmount}
            onChange={(e) => setOrderAmount(e.target.value)}
            step="0.001"
            min="0.001"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-crypto-blue focus:outline-none"
            placeholder="0.001"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleBuyOrder}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center space-x-2 py-3 btn-success"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>매수</span>
          </button>
          
          <button
            onClick={handleSellOrder}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center space-x-2 py-3 btn-danger"
          >
            <TrendingDown className="w-4 h-4" />
            <span>매도</span>
          </button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="loading-spinner"></div>
          <span className="ml-2 text-sm text-gray-400">처리 중...</span>
        </div>
      )}
    </div>
  )
}