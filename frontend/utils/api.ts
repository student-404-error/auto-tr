import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

  // 시스템 상태 조회
  getSystemStatus: async () => {
    const response = await api.get('/api/status')
    return response.data
  }
}

export default api