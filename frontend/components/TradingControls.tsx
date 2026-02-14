'use client'

import { useState, useEffect } from 'react'
import { Play, Square, ShoppingCart, TrendingDown, Bot, TrendingUp, X } from 'lucide-react'
import { useTradingContext } from '@/contexts/TradingContext'

type PositionType = 'long' | 'short'

export default function TradingControls() {
  const { 
    tradingStatus, 
    positions,
    currentPrice: contextCurrentPrice,
    isLoading, 
    error,
    startTrading, 
    stopTrading, 
    placeOrder,
    placeOrderByDollar,
    openPosition,
    openPositionByDollar,
    closePosition,
    fetchPositions,
    fetchCurrentPrice,
    validateOrder,
    getAvailableBalance
  } = useTradingContext()
  
  const [orderAmount, setOrderAmount] = useState('0.001')
  const [dollarAmount, setDollarAmount] = useState('100')
  const [inputMode, setInputMode] = useState<'quantity' | 'dollar'>('dollar')
  const [selectedPositionType, setSelectedPositionType] = useState<PositionType>('long')
  const [showPositions, setShowPositions] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])


  const handleStartTrading = async () => {
    await startTrading()
  }

  const handleStopTrading = async () => {
    await stopTrading()
  }

  // Fetch open positions on component mount
  useEffect(() => {
    fetchPositions()
    // 가격은 WebSocket을 통해 실시간으로 받아오므로 별도 호출 불필요
  }, [fetchPositions])

  // Update quantity when dollar amount or price changes
  useEffect(() => {
    if (inputMode === 'dollar' && contextCurrentPrice && contextCurrentPrice > 0) {
      const calculatedQuantity = (parseFloat(dollarAmount) / contextCurrentPrice).toFixed(6)
      setOrderAmount(calculatedQuantity)
    }
  }, [dollarAmount, contextCurrentPrice, inputMode])

  // Update dollar amount when quantity changes (if in quantity mode)
  useEffect(() => {
    if (inputMode === 'quantity' && contextCurrentPrice && contextCurrentPrice > 0) {
      const calculatedDollar = (parseFloat(orderAmount) * contextCurrentPrice).toFixed(2)
      setDollarAmount(calculatedDollar)
    }
  }, [orderAmount, contextCurrentPrice, inputMode])

  const handleBuyOrder = async () => {
    const validationErrors = validateBuyOrder()
    if (!showValidationErrors(validationErrors)) {
      return
    }

    try {
      if (inputMode === 'dollar') {
        await placeOrderByDollar('Buy', dollarAmount)
      } else {
        await placeOrder('Buy', orderAmount)
      }
    } catch (err: any) {
      // Enhanced error handling
      let errorMessage = '매수 주문 실패'
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      console.error('Buy order error:', errorMessage)
    }
  }

  const handleSellOrder = async () => {
    const validationErrors = validateSellOrder()
    if (!showValidationErrors(validationErrors)) {
      return
    }

    try {
      if (inputMode === 'dollar') {
        await placeOrderByDollar('Sell', dollarAmount)
      } else {
        await placeOrder('Sell', orderAmount)
      }
    } catch (err: any) {
      // Enhanced error handling
      let errorMessage = '매도 주문 실패'
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      console.error('Sell order error:', errorMessage)
    }
  }

  const handlePositionOrder = async (type: PositionType) => {
    const validationErrors = validatePositionOrder(type)
    if (!showValidationErrors(validationErrors)) {
      return
    }

    try {
      if (inputMode === 'dollar') {
        await openPositionByDollar(type, 'BTCUSDT', dollarAmount)
      } else {
        await openPosition(type, 'BTCUSDT', orderAmount)
      }
    } catch (err: any) {
      // Enhanced error handling
      let errorMessage = `${type === 'long' ? '롱' : '숏'} 포지션 열기 실패`
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      console.error('Position order error:', errorMessage)
    }
  }

  const handleInputModeChange = (mode: 'quantity' | 'dollar') => {
    setInputMode(mode)
  }

  const handleDollarAmountChange = (value: string) => {
    setDollarAmount(value)
  }

  const handleQuantityChange = (value: string) => {
    setOrderAmount(value)
  }

  // Validation functions using context
  const validateBuyOrder = () => {
    const amount = inputMode === 'dollar' ? dollarAmount : orderAmount
    return validateOrder('Buy', amount, inputMode)
  }

  const validateSellOrder = () => {
    const amount = inputMode === 'dollar' ? dollarAmount : orderAmount
    return validateOrder('Sell', amount, inputMode)
  }

  const validatePositionOrder = (type: PositionType) => {
    const amount = inputMode === 'dollar' ? dollarAmount : orderAmount
    const errors = validateOrder(type === 'long' ? 'Buy' : 'Sell', amount, inputMode)
    
    // Add position-specific validation
    if (inputMode === 'dollar') {
      const dollarValue = parseFloat(dollarAmount)
      if (!isNaN(dollarValue) && dollarValue > 0 && dollarValue < 10) {
        errors.push('포지션 최소 금액은 $10입니다')
      }
    } else {
      const quantity = parseFloat(orderAmount)
      if (!isNaN(quantity) && quantity > 0 && quantity < 0.001) {
        errors.push('포지션 최소 수량은 0.001 BTC입니다')
      }
    }
    
    return errors
  }

  const showValidationErrors = (errors: string[]) => {
    setValidationErrors(errors)
    if (errors.length > 0) {
      // Clear errors after 5 seconds
      setTimeout(() => setValidationErrors([]), 5000)
      return false
    }
    return true
  }

  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId)
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

      {/* 검증 에러 메시지 */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-orange-900/20 border border-orange-500 rounded-lg">
          <div className="text-orange-400 text-sm">
            <div className="font-medium mb-1">입력 오류:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
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

      {/* 포지션 관리 */}
      <div className="border-t border-gray-700 pt-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-400">포지션 관리</h4>
          <button
            onClick={() => setShowPositions(!showPositions)}
            className="text-xs text-crypto-blue hover:text-crypto-blue/80"
          >
            {showPositions ? '숨기기' : `포지션 보기 (${positions.length})`}
          </button>
        </div>

        {showPositions && (
          <div className="space-y-3 mb-4">
            {positions.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                열린 포지션이 없습니다
              </div>
            ) : (
              positions.map((position) => (
                <div key={position.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        position.type === 'long' 
                          ? 'bg-crypto-green/20 text-crypto-green' 
                          : 'bg-crypto-red/20 text-crypto-red'
                      }`}>
                        {position.type.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{position.symbol}</span>
                    </div>
                    <button
                      onClick={() => handleClosePosition(position.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">진입가:</span>
                      <span className="ml-1 text-white">${position.entryPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">수량:</span>
                      <span className="ml-1 text-white">{position.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">투자금:</span>
                      <span className="ml-1 text-white">${position.dollarAmount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">손익:</span>
                      <span className={`ml-1 ${position.unrealizedPnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                        ${position.unrealizedPnl.toFixed(2)} ({position.unrealizedPnlPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 포지션 타입 선택 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">포지션 타입</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedPositionType('long')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-colors ${
                selectedPositionType === 'long'
                  ? 'bg-crypto-green/20 text-crypto-green border border-crypto-green'
                  : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-crypto-green/50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>롱 (Long)</span>
            </button>
            
            <button
              onClick={() => setSelectedPositionType('short')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-colors ${
                selectedPositionType === 'short'
                  ? 'bg-crypto-red/20 text-crypto-red border border-crypto-red'
                  : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-crypto-red/50'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>숏 (Short)</span>
            </button>
          </div>
        </div>

        {/* 주문 입력 모드 선택 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">주문 방식</label>
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => handleInputModeChange('dollar')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'dollar'
                  ? 'bg-crypto-blue/20 text-crypto-blue border border-crypto-blue'
                  : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-crypto-blue/50'
              }`}
            >
              달러 금액
            </button>
            <button
              onClick={() => handleInputModeChange('quantity')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'quantity'
                  ? 'bg-crypto-blue/20 text-crypto-blue border border-crypto-blue'
                  : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-crypto-blue/50'
              }`}
            >
              수량 (BTC)
            </button>
          </div>

          {/* 현재 가격 및 잔액 표시 */}
          <div className="mb-3 p-3 bg-gray-800/50 rounded-lg space-y-2">
            {contextCurrentPrice && contextCurrentPrice > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">현재 BTC 가격:</span>
                <span className="text-white font-medium">${contextCurrentPrice.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">사용 가능한 USD:</span>
              <span className="text-white font-medium">${getAvailableBalance('USDT').toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">보유 BTC:</span>
              <span className="text-white font-medium">{getAvailableBalance('BTC').toFixed(6)} BTC</span>
            </div>
          </div>

          {/* 달러 금액 입력 */}
          {inputMode === 'dollar' && (
            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-2">투자 금액 ($)</label>
              <input
                type="number"
                value={dollarAmount}
                onChange={(e) => handleDollarAmountChange(e.target.value)}
                step="1"
                min="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-crypto-blue focus:outline-none"
                placeholder="100"
              />
              <div className="mt-1 text-xs text-gray-500">
                계산된 수량: {orderAmount} BTC
              </div>
            </div>
          )}

          {/* 수량 입력 */}
          {inputMode === 'quantity' && (
            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-2">주문량 (BTC)</label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => handleQuantityChange(e.target.value)}
                step="0.001"
                min="0.001"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-crypto-blue focus:outline-none"
                placeholder="0.001"
              />
              <div className="mt-1 text-xs text-gray-500">
                예상 비용: ${dollarAmount}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => handlePositionOrder(selectedPositionType)}
          disabled={isLoading}
          className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors ${
            selectedPositionType === 'long'
              ? 'bg-crypto-green hover:bg-crypto-green/80 text-white'
              : 'bg-crypto-red hover:bg-crypto-red/80 text-white'
          }`}
        >
          {selectedPositionType === 'long' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{selectedPositionType === 'long' ? '롱 포지션 열기' : '숏 포지션 열기'}</span>
        </button>
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