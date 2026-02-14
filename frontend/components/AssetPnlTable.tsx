'use client'

import { PortfolioData } from '@/services/portfolioService'

interface Props {
  portfolioData: PortfolioData | null
}

function fmtUSD(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}
function fmtPct(v: number) {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

export default function AssetPnlTable({ portfolioData }: Props) {
  if (!portfolioData || Object.keys(portfolioData.assets).length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">코인별 손익률</h3>
        <p className="text-gray-400 text-sm">보유 중인 코인이 없습니다.</p>
      </div>
    )
  }

  const rows = Object.entries(portfolioData.assets)
    .filter(([_, asset]) => asset.total_quantity > 0)
    .map(([symbol, asset]) => ({
      symbol,
      quantity: asset.total_quantity,
      avg: asset.average_price,
      price: asset.current_price,
      value: asset.current_value,
      pnl: asset.unrealized_pnl,
      pnlPct: asset.unrealized_pnl_percent,
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">코인별 손익률</h3>
        <span className="text-xs text-gray-400">현 포트폴리오 기준</span>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="py-2 pr-3 text-left">심볼</th>
            <th className="py-2 px-3 text-right">보유수량</th>
            <th className="py-2 px-3 text-right">평단가</th>
            <th className="py-2 px-3 text-right">현재가</th>
            <th className="py-2 px-3 text-right">평가금액</th>
            <th className="py-2 pl-3 text-right">손익</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className="border-b border-gray-800 last:border-0">
              <td className="py-2 pr-3 font-semibold">{row.symbol}</td>
              <td className="py-2 px-3 text-right">{row.quantity.toFixed(6)}</td>
              <td className="py-2 px-3 text-right text-gray-300">{fmtUSD(row.avg)}</td>
              <td className="py-2 px-3 text-right text-gray-300">{fmtUSD(row.price)}</td>
              <td className="py-2 px-3 text-right">{fmtUSD(row.value)}</td>
              <td className="py-2 pl-3 text-right">
                <span className={row.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {fmtUSD(row.pnl)} ({fmtPct(row.pnlPct)})
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
