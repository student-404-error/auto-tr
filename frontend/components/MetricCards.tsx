'use client'

import Link from 'next/link'

interface TradingStatus {
  is_active: boolean
  strategy?: string
  strategy_name?: string
  position?: string | null
  last_signal?: string | null
}

const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  regime_trend: 'Regime Trend',
  breakout_volume: 'Breakout + Volume',
  mean_reversion: 'Mean Reversion',
  dual_timeframe: 'Dual Timeframe',
}

interface MetricCardsProps {
  tradingStatus: TradingStatus | null
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  riskPercent: number
  positionSide: string | null
  leverage: string
  entryPrice: number
  liquidationPrice: number
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MetricCards({
  tradingStatus,
  unrealizedPnl,
  unrealizedPnlPercent,
  riskPercent,
  positionSide,
  leverage,
  entryPrice,
  liquidationPrice,
}: MetricCardsProps) {
  const isActive = tradingStatus?.is_active || false
  const strategyKey = tradingStatus?.strategy || tradingStatus?.strategy_name || ''
  const strategyName = STRATEGY_DISPLAY_NAMES[strategyKey] || strategyKey || 'No Strategy'
  const pnlPositive = unrealizedPnl >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Strategy Card - Clickable link to /strategy */}
      <Link href="/strategy" className="bg-card-dark rounded-xl p-5 border border-slate-700/60 shadow-sm relative overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="material-icons text-6xl text-primary">psychology</span>
        </div>
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Strategy</span>
          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary shadow-[0_0_8px_rgba(30,148,246,0.6)]' : 'bg-slate-600'}`}></div>
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{strategyName}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {isActive ? 'ACTIVE' : 'STOPPED'}
          </span>
          <span className="text-xs text-slate-500 group-hover:text-primary transition-colors flex items-center gap-0.5">
            Details <span className="material-icons text-xs">arrow_forward</span>
          </span>
        </div>
      </Link>

      {/* Position Card */}
      <div className="bg-card-dark rounded-xl p-5 border border-slate-700/60 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Position</span>
          <span className="material-icons text-slate-500 text-sm">layers</span>
        </div>
        <div className="flex items-baseline gap-3">
          {positionSide ? (
            <>
              <span className={`text-2xl font-bold font-mono ${positionSide.toUpperCase() === 'LONG' ? 'text-green-500' : 'text-red-400'}`}>
                {positionSide.toUpperCase()}
              </span>
              {leverage && <span className="text-sm font-medium text-slate-400">{leverage}</span>}
            </>
          ) : (
            <span className="text-2xl font-bold font-mono text-slate-500">FLAT</span>
          )}
        </div>
        <div className="mt-3 flex justify-between text-xs font-mono">
          <span className="text-slate-500">Entry: <span className="text-slate-300">{entryPrice > 0 ? formatPrice(entryPrice) : '-'}</span></span>
          <span className="text-slate-500">Liq: <span className="text-red-400">{liquidationPrice > 0 ? formatPrice(liquidationPrice) : '-'}</span></span>
        </div>
      </div>

      {/* PnL Card */}
      <div className="bg-card-dark rounded-xl p-5 border border-slate-700/60 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
        <div className="flex justify-between items-start mb-2 relative z-10">
          <span className={`text-xs font-bold uppercase tracking-wider ${pnlPositive ? 'text-primary' : 'text-red-400'}`}>Unrealized PnL</span>
          <span className={`material-icons text-sm ${pnlPositive ? 'text-primary/50' : 'text-red-400/50'}`}>show_chart</span>
        </div>
        <div className="relative z-10">
          <div className={`text-2xl font-bold font-mono tracking-tight ${pnlPositive ? 'text-primary' : 'text-red-400'}`}>
            {pnlPositive ? '+' : ''}${formatPrice(Math.abs(unrealizedPnl))}
          </div>
          <div className={`text-sm font-medium mt-1 flex items-center gap-1 ${pnlPositive ? 'text-primary/70' : 'text-red-400/70'}`}>
            <span className="material-icons text-xs">{pnlPositive ? 'trending_up' : 'trending_down'}</span>
            {unrealizedPnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Risk Gauge */}
      <div className="bg-card-dark rounded-xl p-5 border border-slate-700/60 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risk / Margin</span>
          <span className="text-xs font-mono text-slate-300">{riskPercent}%</span>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${riskPercent > 70 ? 'bg-gradient-to-r from-yellow-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-primary'}`}
              style={{ width: `${Math.min(riskPercent, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
            <span>0%</span>
            <span>{riskPercent <= 50 ? 'Safe Zone' : riskPercent <= 70 ? 'Moderate' : 'High Risk'}</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
