'use client'

import { useEffect, useState } from 'react'
import EnhancedPriceChart from './EnhancedPriceChart'
import { PortfolioData } from '@/services/portfolioService'

interface Props {
  portfolioData: PortfolioData | null
}

export default function AssetChartCard({ portfolioData }: Props) {
  const symbols = portfolioData ? Object.keys(portfolioData.assets) : []
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!selected && symbols.length > 0) {
      setSelected(symbols[0])
    }
  }, [symbols, selected])

  if (symbols.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">보유 코인 차트</h3>
        <p className="text-gray-400 text-sm">보유 중인 코인이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">보유 코인 차트</h3>
        <select
          value={selected ?? symbols[0]}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1 text-sm"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {selected && <EnhancedPriceChart symbol={selected} showMarkers={true} />}
    </div>
  )
}
