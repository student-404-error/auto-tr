'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface AssetData {
  symbol: string
  total_quantity: number
  total_invested: number
  current_value: number
  average_price: number
  current_price: number
  unrealized_pnl: number
  unrealized_pnl_percent: number
  percentage_of_portfolio: number
  positions: any[]
  recent_trades: any[]
}

interface PortfolioData {
  timestamp: string
  total_portfolio_value: number
  total_invested: number
  total_unrealized_pnl: number
  total_unrealized_pnl_percent: number
  supported_assets: string[]
  assets: Record<string, AssetData>
  position_summary: any
  asset_count: number
}

interface Portfolio {
  balances: Record<string, { balance: number; available: number }>
  current_btc_price: number
  total_value_usd: number
  timestamp: number
  error?: string
  live_trading?: boolean
  authenticated?: boolean
  max_trade_amount?: number
}

interface PortfolioPieChartProps {
  portfolioData: PortfolioData | null
  legacyPortfolio: Portfolio | null
  onAssetClick?: (symbol: string) => void
}

// Color scheme for different cryptocurrencies
const ASSET_COLORS: Record<string, string> = {
  'USDT': '#26A17B', // USDT Green
  'BTCUSDT': '#F7931A', // Bitcoin Orange
  'BTC': '#F7931A', // Bitcoin Orange
  'XRPUSDT': '#23292F', // XRP Dark
  'XRP': '#23292F', // XRP Dark
  'SOLUSDT': '#9945FF', // Solana Purple
  'SOL': '#9945FF', // Solana Purple
  'ETHUSDT': '#627EEA', // Ethereum Blue
  'ETH': '#627EEA', // Ethereum Blue
  'ADAUSDT': '#0033AD', // Cardano Blue
  'ADA': '#0033AD', // Cardano Blue
  'DOTUSDT': '#E6007A', // Polkadot Pink
  'DOT': '#E6007A', // Polkadot Pink
}

const RADIAN = Math.PI / 180

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null // Don't show labels for very small slices

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold">{data.name}</p>
        <p className="text-gray-300">
          Value: <span className="text-crypto-green">${data.value.toLocaleString()}</span>
        </p>
        <p className="text-gray-300">
          Percentage: <span className="text-crypto-blue">{data.percentage.toFixed(2)}%</span>
        </p>
        {data.pnl !== 0 && (
          <p className="text-gray-300">
            P&L: <span className={data.pnl >= 0 ? 'text-crypto-green' : 'text-red-400'}>
              ${data.pnl.toLocaleString()} ({data.pnlPercent >= 0 ? '+' : ''}{data.pnlPercent.toFixed(2)}%)
            </span>
          </p>
        )}
      </div>
    )
  }
  return null
}

export default function PortfolioPieChart({ portfolioData, legacyPortfolio, onAssetClick }: PortfolioPieChartProps) {
  // Combine data from both sources
  const combinedData = React.useMemo(() => {
    const assets: Array<{
      name: string
      symbol: string
      value: number
      percentage: number
      pnl: number
      pnlPercent: number
      color: string
    }> = []

    let totalValue = 0

    // Add multi-asset portfolio data
    if (portfolioData && portfolioData.assets) {
      Object.entries(portfolioData.assets).forEach(([symbol, asset]) => {
        if (asset.current_value > 0) {
          assets.push({
            name: symbol.replace('USDT', ''),
            symbol: symbol,
            value: asset.current_value,
            percentage: 0, // Will calculate later
            pnl: asset.unrealized_pnl,
            pnlPercent: asset.unrealized_pnl_percent,
            color: ASSET_COLORS[symbol] || '#6B7280'
          })
          totalValue += asset.current_value
        }
      })
    }

    // Add legacy portfolio data (USDT and BTC balances)
    if (legacyPortfolio && legacyPortfolio.balances) {
      Object.entries(legacyPortfolio.balances).forEach(([coin, data]) => {
        if (data.balance > 0) {
          let value = 0
          let pnl = 0
          let pnlPercent = 0

          if (coin === 'USDT') {
            value = data.balance
            // USDT has no P&L as it's stable
          } else if (coin === 'BTC') {
            value = data.balance * legacyPortfolio.current_btc_price
            // For BTC, we don't have cost basis here, so P&L is 0
          }

          // Check if this asset is already in multi-asset data
          const existingAsset = assets.find(asset => 
            asset.symbol === `${coin}USDT` || 
            (coin === 'USDT' && asset.symbol === 'USDT') ||
            (coin === 'BTC' && asset.symbol === 'BTCUSDT')
          )

          if (!existingAsset && value > 0) {
            assets.push({
              name: coin,
              symbol: coin === 'USDT' ? 'USDT' : `${coin}USDT`,
              value: value,
              percentage: 0, // Will calculate later
              pnl: pnl,
              pnlPercent: pnlPercent,
              color: ASSET_COLORS[coin] || '#6B7280'
            })
            totalValue += value
          } else if (existingAsset && coin === 'BTC') {
            // Update existing BTC asset with legacy data if it has more value
            if (value > existingAsset.value) {
              existingAsset.value = value
              totalValue = totalValue - existingAsset.value + value
            }
          }
        }
      })
    }

    // Calculate percentages
    if (totalValue > 0) {
      assets.forEach(asset => {
        asset.percentage = (asset.value / totalValue) * 100
      })
    }

    return {
      assets: assets.sort((a, b) => b.value - a.value),
      totalValue,
      totalInvested: portfolioData?.total_invested || legacyPortfolio?.total_value_usd || 0,
      totalPnl: portfolioData?.total_unrealized_pnl || 0,
      totalPnlPercent: portfolioData?.total_unrealized_pnl_percent || 0
    }
  }, [portfolioData, legacyPortfolio])

  // Show empty state if no data
  if (combinedData.totalValue === 0) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="w-5 h-5 text-crypto-blue" />
          <h3 className="text-lg font-semibold">Portfolio Distribution</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="w-16 h-16 rounded-full border-4 border-gray-600 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8" />
          </div>
          <p className="text-center">No investments yet</p>
          <p className="text-sm text-gray-500 mt-2">Start trading to see your portfolio distribution</p>
        </div>
      </div>
    )
  }

  const chartData = combinedData.assets

  const handlePieClick = (data: any) => {
    if (onAssetClick) {
      onAssetClick(data.symbol)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-5 h-5 text-crypto-blue" />
          <h3 className="text-lg font-semibold">Portfolio Distribution</h3>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Total Value</div>
          <div className="text-xl font-bold text-crypto-green">
            ${combinedData.totalValue.toLocaleString()}
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="w-16 h-16 rounded-full border-4 border-gray-600 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8" />
          </div>
          <p className="text-center">No active positions</p>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="#1F2937"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Asset List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Asset Breakdown</h4>
            {chartData.map((asset) => (
              <div 
                key={asset.symbol}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => handlePieClick(asset)}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: asset.color }}
                  />
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-gray-400">
                      {asset.percentage.toFixed(1)}% of portfolio
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-medium">
                    ${asset.value.toLocaleString()}
                  </div>
                  {asset.pnl !== 0 || asset.pnlPercent !== 0 ? (
                    <div className={`text-sm flex items-center ${
                      asset.pnl >= 0 ? 'text-crypto-green' : 'text-red-400'
                    }`}>
                      {asset.pnl >= 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {asset.pnl >= 0 ? '+' : ''}${asset.pnl.toLocaleString()} 
                      ({asset.pnlPercent >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(1)}%)
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      {asset.name === 'USDT' ? 'Stable Asset' : 'No P&L Data'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Portfolio Summary */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Total Value</div>
            <div className="font-medium">
              ${combinedData.totalValue.toLocaleString()}
            </div>
          </div>
          {combinedData.totalPnl !== 0 && (
            <div>
              <div className="text-sm text-gray-400">Total P&L</div>
              <div className={`font-medium flex items-center ${
                combinedData.totalPnl >= 0 ? 'text-crypto-green' : 'text-red-400'
              }`}>
                {combinedData.totalPnl >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {combinedData.totalPnl >= 0 ? '+' : ''}${combinedData.totalPnl.toLocaleString()}
                <span className="text-sm ml-1">
                  ({combinedData.totalPnlPercent >= 0 ? '+' : ''}{combinedData.totalPnlPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          Last updated: {new Date(portfolioData?.timestamp || legacyPortfolio?.timestamp || Date.now()).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}