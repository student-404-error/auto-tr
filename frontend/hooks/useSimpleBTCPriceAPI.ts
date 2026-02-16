import { useState, useEffect } from 'react'
import { tradingApi } from '@/utils/api'

interface BTCPriceData {
  price: number
  change_24h: number
  timestamp: number
}

export function useSimpleBTCPriceAPI() {
  const [priceData, setPriceData] = useState<BTCPriceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrice = async () => {
    try {
      setError(null)
      const data = await tradingApi.getPrice('BTCUSDT')
      
      setPriceData({
        price: data.price || 0,
        change_24h: data.change_24h || 0,
        timestamp: Date.now()
      })
      
      setIsLoading(false)
    } catch (err) {
      console.error('가격 조회 오류:', err)
      setError('가격 조회에 실패했습니다')
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트시 즉시 가격 조회
  useEffect(() => {
    fetchPrice()
  }, [])

  // 15초마다 가격 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrice()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  return {
    price: priceData?.price || 0,
    change24h: priceData?.change_24h || 0,
    isLoading,
    error,
    isConnected: !error && !isLoading, // API 호출 성공시 연결됨으로 간주
    refetch: fetchPrice
  }
}
