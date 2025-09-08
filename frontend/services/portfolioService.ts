import { tradingApi } from '@/utils/api'

export interface AssetData {
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

export interface PortfolioData {
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

export interface PortfolioAllocation {
  [symbol: string]: number
}

export interface PortfolioPerformance {
  daily_change: number
  weekly_change: number
  monthly_change: number
  daily_change_percent: number
  weekly_change_percent: number
  monthly_change_percent: number
  best_performing_asset: string | null
  worst_performing_asset: string | null
}

class PortfolioService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  /**
   * Get cached data if it's still valid
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T
    }
    return null
  }

  /**
   * Set data in cache
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Fetch multi-asset portfolio data
   */
  async getMultiAssetPortfolio(): Promise<PortfolioData> {
    const cacheKey = 'multi-asset-portfolio'
    const cached = this.getCachedData<PortfolioData>(cacheKey)
    
    if (cached) {
      return cached
    }

    try {
      const response = await fetch('/api/portfolio/multi-asset')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: PortfolioData = await response.json()
      this.setCachedData(cacheKey, data)
      return data
    } catch (error) {
      console.error('Failed to fetch multi-asset portfolio:', error)
      throw error
    }
  }

  /**
   * Get asset allocation for pie chart
   */
  async getAssetAllocation(): Promise<PortfolioAllocation> {
    const cacheKey = 'asset-allocation'
    const cached = this.getCachedData<{ allocation: PortfolioAllocation }>(cacheKey)
    
    if (cached) {
      return cached.allocation
    }

    try {
      const response = await fetch('/api/portfolio/allocation')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      this.setCachedData(cacheKey, data)
      return data.allocation
    } catch (error) {
      console.error('Failed to fetch asset allocation:', error)
      throw error
    }
  }

  /**
   * Calculate portfolio distribution percentages
   */
  calculatePortfolioDistribution(portfolioData: PortfolioData): Array<{
    symbol: string
    name: string
    value: number
    percentage: number
    pnl: number
    pnlPercent: number
    color: string
  }> {
    const assets = Object.entries(portfolioData.assets)
      .filter(([_, asset]) => asset.current_value > 0)
      .map(([symbol, asset]) => ({
        symbol,
        name: symbol.replace('USDT', ''),
        value: asset.current_value,
        percentage: asset.percentage_of_portfolio,
        pnl: asset.unrealized_pnl,
        pnlPercent: asset.unrealized_pnl_percent,
        color: this.getAssetColor(symbol)
      }))
      .sort((a, b) => b.value - a.value)

    return assets
  }

  /**
   * Calculate real-time portfolio value updates
   */
  async calculateRealTimePortfolioValue(
    portfolioData: PortfolioData,
    currentPrices: Record<string, number>
  ): Promise<{
    totalValue: number
    totalPnl: number
    totalPnlPercent: number
    assets: Record<string, {
      currentValue: number
      pnl: number
      pnlPercent: number
      priceChange: number
      priceChangePercent: number
    }>
  }> {
    let totalValue = 0
    let totalPnl = 0
    const updatedAssets: Record<string, any> = {}

    for (const [symbol, asset] of Object.entries(portfolioData.assets)) {
      const currentPrice = currentPrices[symbol] || asset.current_price
      const priceChange = currentPrice - asset.current_price
      const priceChangePercent = asset.current_price > 0 
        ? (priceChange / asset.current_price) * 100 
        : 0

      const currentValue = asset.total_quantity * currentPrice
      const pnl = currentValue - asset.total_invested
      const pnlPercent = asset.total_invested > 0 
        ? (pnl / asset.total_invested) * 100 
        : 0

      updatedAssets[symbol] = {
        currentValue,
        pnl,
        pnlPercent,
        priceChange,
        priceChangePercent
      }

      totalValue += currentValue
      totalPnl += pnl
    }

    const totalPnlPercent = portfolioData.total_invested > 0 
      ? (totalPnl / portfolioData.total_invested) * 100 
      : 0

    return {
      totalValue,
      totalPnl,
      totalPnlPercent,
      assets: updatedAssets
    }
  }

  /**
   * Get portfolio performance statistics
   */
  async getPortfolioPerformance(): Promise<PortfolioPerformance> {
    try {
      const response = await fetch('/api/portfolio/performance')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch portfolio performance:', error)
      // Return default values on error
      return {
        daily_change: 0,
        weekly_change: 0,
        monthly_change: 0,
        daily_change_percent: 0,
        weekly_change_percent: 0,
        monthly_change_percent: 0,
        best_performing_asset: null,
        worst_performing_asset: null
      }
    }
  }

  /**
   * Calculate P&L for specific asset
   */
  calculateAssetPnL(
    totalQuantity: number,
    averagePrice: number,
    currentPrice: number,
    totalInvested: number
  ): {
    currentValue: number
    unrealizedPnl: number
    unrealizedPnlPercent: number
  } {
    const currentValue = totalQuantity * currentPrice
    const unrealizedPnl = currentValue - totalInvested
    const unrealizedPnlPercent = totalInvested > 0 
      ? (unrealizedPnl / totalInvested) * 100 
      : 0

    return {
      currentValue,
      unrealizedPnl,
      unrealizedPnlPercent
    }
  }

  /**
   * Get color for asset (for charts)
   */
  private getAssetColor(symbol: string): string {
    const colors: Record<string, string> = {
      'BTCUSDT': '#F7931A', // Bitcoin Orange
      'XRPUSDT': '#23292F', // XRP Dark
      'SOLUSDT': '#9945FF', // Solana Purple
      'ETHUSDT': '#627EEA', // Ethereum Blue
      'ADAUSDT': '#0033AD', // Cardano Blue
      'DOTUSDT': '#E6007A', // Polkadot Pink
    }
    return colors[symbol] || '#6B7280'
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(decimals)}%`
  }

  /**
   * Get combined portfolio summary for display
   */
  getCombinedPortfolioSummary(
    portfolioData: PortfolioData | null, 
    legacyPortfolio: any | null
  ): {
    totalAssets: number
    totalValue: string
    totalPnl: string
    totalPnlPercent: string
    bestAsset: string | null
    worstAsset: string | null
  } {
    let totalValue = 0
    let totalPnl = 0
    let totalInvested = 0
    const assets: Array<{ symbol: string; pnlPercent: number }> = []

    // Add multi-asset portfolio data
    if (portfolioData && portfolioData.assets) {
      Object.entries(portfolioData.assets).forEach(([symbol, asset]) => {
        if (asset.current_value > 0) {
          totalValue += asset.current_value
          totalPnl += asset.unrealized_pnl
          totalInvested += asset.total_invested
          assets.push({
            symbol: symbol.replace('USDT', ''),
            pnlPercent: asset.unrealized_pnl_percent
          })
        }
      })
    }

    // Add legacy portfolio data
    if (legacyPortfolio && legacyPortfolio.balances) {
      Object.entries(legacyPortfolio.balances).forEach(([coin, data]: [string, any]) => {
        if (data.balance > 0) {
          let value = 0
          if (coin === 'USDT') {
            value = data.balance
          } else if (coin === 'BTC') {
            value = data.balance * legacyPortfolio.current_btc_price
          }

          // Check if not already counted in multi-asset data
          const existingAsset = assets.find(asset => 
            asset.symbol === coin || 
            (coin === 'BTC' && asset.symbol === 'BTC')
          )

          if (!existingAsset && value > 0) {
            totalValue += value
            assets.push({
              symbol: coin,
              pnlPercent: 0 // No P&L data for legacy assets
            })
          }
        }
      })
    }

    // Find best and worst performing assets
    let bestAsset: string | null = null
    let worstAsset: string | null = null
    let bestPnlPercent = -Infinity
    let worstPnlPercent = Infinity

    assets.forEach(asset => {
      if (asset.pnlPercent > bestPnlPercent) {
        bestPnlPercent = asset.pnlPercent
        bestAsset = asset.symbol
      }
      if (asset.pnlPercent < worstPnlPercent) {
        worstPnlPercent = asset.pnlPercent
        worstAsset = asset.symbol
      }
    })

    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

    return {
      totalAssets: assets.length,
      totalValue: this.formatCurrency(totalValue),
      totalPnl: this.formatCurrency(totalPnl),
      totalPnlPercent: this.formatPercentage(totalPnlPercent),
      bestAsset,
      worstAsset
    }
  }

  /**
   * Get portfolio summary for display (legacy method)
   */
  getPortfolioSummary(portfolioData: PortfolioData): {
    totalAssets: number
    totalValue: string
    totalPnl: string
    totalPnlPercent: string
    bestAsset: string | null
    worstAsset: string | null
  } {
    return this.getCombinedPortfolioSummary(portfolioData, null)
  }

  /**
   * Clear cache (useful for forcing refresh)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService()