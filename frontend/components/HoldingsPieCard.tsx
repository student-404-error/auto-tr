'use client'

import { PortfolioData } from '@/services/portfolioService'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  portfolioData: PortfolioData | null
}

const COLORS = ['#22d3ee', '#fbbf24', '#f97316', '#a855f7', '#34d399', '#ef4444', '#60a5fa']

export default function HoldingsPieCard({ portfolioData }: Props) {
  if (!portfolioData) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">지갑 구성</h3>
        <p className="text-gray-400 text-sm">포트폴리오 데이터를 불러오는 중입니다.</p>
      </div>
    )
  }

  const data = Object.entries(portfolioData.assets)
    .filter(([_, asset]) => asset.current_value > 0)
    .map(([symbol, asset]) => ({
      name: symbol.replace('USDT', ''),
      value: asset.current_value,
    }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">지갑 구성</h3>
        <p className="text-gray-400 text-sm">보유 중인 자산이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">지갑 구성</h3>
        <span className="text-xs text-gray-400">USD 평가 기준</span>
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
