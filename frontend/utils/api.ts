import axios from 'axios'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.dataquantlab.com'
  // 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 응답 인터셉터
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const tradingApi = {
  // 포트폴리오 조회
  getPortfolio: async () => {
    const response = await api.get('/api/portfolio')
    return response.data
  },

  // 거래 내역 조회
  getTradeHistory: async () => {
    const response = await api.get('/api/trades')
    return response.data
  },

  // 가격 조회
  getPrice: async (symbol: string = 'BTCUSDT') => {
    const response = await api.get(`/api/price/${symbol}`)
    return response.data
  },

  // 차트 데이터 조회
  getChartData: async (symbol: string = 'BTCUSDT', interval: string = '1', limit: number = 100) => {
    const response = await api.get(`/api/chart/${symbol}`, {
      params: { interval, limit }
    })
    return response.data
  },

  // 자동매매 시작
  startTrading: async () => {
    const response = await api.post('/api/trading/start')
    return response.data
  },

  // 자동매매 중지
  stopTrading: async () => {
    const response = await api.post('/api/trading/stop')
    return response.data
  },

  // 트레이딩 상태 조회
  getTradingStatus: async () => {
    const response = await api.get('/api/trading/status')
    return response.data
  },

  // 수동 주문
  placeOrder: async (symbol: string, side: string, qty: string) => {
    const response = await api.post('/api/order', {
      symbol,
      side,
      qty
    })
    return response.data
  },

  // 달러 기반 주문
  placeOrderByDollar: async (symbol: string, side: string, dollarAmount: string) => {
    const response = await api.post('/api/order/dollar', {
      symbol,
      side,
      dollarAmount
    })
    return response.data
  },

  // 시스템 상태 조회
  getSystemStatus: async () => {
    const response = await api.get('/api/status')
    return response.data
  },

  // 포트폴리오 히스토리 조회
  getPortfolioHistory: async (period: string = '7d') => {
    const response = await api.get(`/api/portfolio/history?period=${period}`)
    return response.data
  },

  // 포트폴리오 수익률 통계
  getPortfolioPerformance: async () => {
    const response = await api.get('/api/portfolio/performance')
    return response.data
  },

  // 현재 포지션 조회
  getPositions: async () => {
    const response = await api.get('/api/positions')
    return response.data
  },

  // 최근 거래 신호 조회
  getRecentSignals: async (limit: number = 5) => {
    const response = await api.get(`/api/signals?limit=${limit}`)
    return response.data
  },

  // 손익 조회
  getPnL: async (symbol: string = 'BTCUSDT') => {
    const response = await api.get(`/api/pnl/${symbol}`)
    return response.data
  },

  // 테스트 신호 생성 (개발용)
  createTestSignal: async (signalType: string = 'buy') => {
    const response = await api.post(`/api/signals/test?signal_type=${signalType}`)
    return response.data
  },

  // 다중 자산 포트폴리오 조회
  getMultiAssetPortfolio: async () => {
    const response = await api.get('/api/portfolio/multi-asset')
    return response.data
  },

  // 자산 배분 현황 조회
  getAssetAllocation: async () => {
    const response = await api.get('/api/portfolio/allocation')
    return response.data
  },

  // 거래 마커 조회 (차트용)
  getTradeMarkers: async (symbol: string = 'BTCUSDT') => {
    const response = await api.get(`/api/trades/markers/${symbol}`)
    return response.data
  },

  // 현재 가격 조회
  getCurrentPrice: async (symbol: string = 'BTCUSDT') => {
    const response = await api.get(`/api/price/${symbol}`)
    return response.data
  },

  // Position Management API
  
  // 포지션 열기
  openPosition: async (
    symbol: string, 
    position_type: 'long' | 'short', 
    entry_price: number, 
    quantity: number, 
    dollar_amount: number
  ) => {
    const response = await api.post('/api/positions/open', {
      symbol,
      position_type,
      entry_price,
      quantity,
      dollar_amount
    })
    return response.data
  },

  // 포지션 닫기
  closePosition: async (position_id: string, close_price?: number) => {
    const response = await api.post('/api/positions/close', {
      position_id,
      close_price
    })
    return response.data
  },

  // 열린 포지션 조회
  getOpenPositions: async (symbol?: string) => {
    const params = symbol ? { symbol } : {}
    const response = await api.get('/api/positions/open', { params })
    return response.data
  },

  // 닫힌 포지션 조회
  getClosedPositions: async (symbol?: string, limit: number = 50) => {
    const params = { limit, ...(symbol ? { symbol } : {}) }
    const response = await api.get('/api/positions/closed', { params })
    return response.data
  },

  // 포지션 요약 및 통계
  getPositionsSummary: async (symbol?: string) => {
    const params = symbol ? { symbol } : {}
    const response = await api.get('/api/positions/summary', { params })
    return response.data
  },

  // 포지션 상세 조회
  getPositionDetails: async (position_id: string) => {
    const response = await api.get(`/api/positions/${position_id}`)
    return response.data
  },

  // 포지션 가격 업데이트
  updatePositionPrices: async () => {
    const response = await api.post('/api/positions/update-prices')
    return response.data
  },

  // 자동 포지션 종료
  autoClosePositions: async (
    symbol?: string,
    max_loss_percent?: number,
    min_profit_percent?: number,
    max_days_open?: number
  ) => {
    const params = {
      ...(symbol ? { symbol } : {}),
      ...(max_loss_percent !== undefined ? { max_loss_percent } : {}),
      ...(min_profit_percent !== undefined ? { min_profit_percent } : {}),
      ...(max_days_open !== undefined ? { max_days_open } : {})
    }
    const response = await api.post('/api/positions/auto-close', null, { params })
    return response.data
  }
}

export default api
