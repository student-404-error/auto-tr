'use client'

import { Wallet, TrendingUp, DollarSign } from 'lucide-react'

interface Portfolio {
  balances: Record<string, { balance: number; available: number }>
  current_btc_price: number
  total_value_usd: number
  timestamp: number
}

interface PortfolioCardProps {
  portfolio: Portfolio | null
}

export default function PortfolioCard({ portfolio }: PortfolioCardProps) {
  if (!portfolio) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Wallet className="w-5 h-5 text-crypto-blue" />
          <h3 className="text-lg font-semibold">포트폴리오</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  const { balances, total_value_usd } = portfolio

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <Wallet className="w-5 h-5 text-crypto-blue" />
        <h3 className="text-lg font-semibold">포트폴리오</h3>
      </div>

      {/* 총 자산 */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <DollarSign className="w-4 h-4 text-crypto-green" />
          <span className="text-sm text-gray-400">총 자산</span>
        </div>
        <div className="text-2xl font-bold text-crypto-green">
          ${total_value_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 보유 자산 목록 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-400 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          보유 자산
        </h4>
        
        {Object.entries(balances).length === 0 ? (
          <p className="text-gray-500 text-sm">보유 자산이 없습니다</p>
        ) : (
          Object.entries(balances).map(([coin, data]) => (
            <div key={coin} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
              <div>
                <div className="font-medium">{coin}</div>
                <div className="text-sm text-gray-400">
                  사용 가능: {data.available.toFixed(6)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {data.balance.toFixed(6)}
                </div>
                <div className="text-sm text-gray-400">
                  {coin === 'BTC' && portfolio.current_btc_price
                    ? `$${(data.balance * portfolio.current_btc_price).toLocaleString()}`
                    : coin === 'USDT'
                    ? `$${data.balance.toLocaleString()}`
                    : ''
                  }
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 마지막 업데이트 시간 */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          마지막 업데이트: {new Date(portfolio.timestamp * 1000).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}