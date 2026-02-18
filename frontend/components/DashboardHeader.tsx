'use client'

interface DashboardHeaderProps {
  symbol: string
  onSymbolChange: (symbol: string) => void
  markPrice: number
  totalEquity: number
  serverOnline: boolean
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatEquity(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const SYMBOLS = ['BTCUSDT', 'XRPUSDT', 'SOLUSDT']

export default function DashboardHeader({ symbol, onSymbolChange, markPrice, totalEquity, serverOnline }: DashboardHeaderProps) {
  const pair = symbol.replace('USDT', '/USDT')

  return (
    <div className="px-5 py-6 md:px-8 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 bg-background-dark/95 backdrop-blur sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">{pair}</span>
          <select
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 focus:outline-none"
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s.replace('USDT', '/USDT')}
              </option>
            ))}
          </select>
        </div>
        <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-slate-400 text-sm">Mark:</span>
          <span className="text-white font-mono font-medium">${formatPrice(markPrice)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 md:gap-6">
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 uppercase tracking-wide font-bold">Total Equity</span>
          <span className="text-lg font-bold text-white tracking-tight font-mono">${formatEquity(totalEquity)}</span>
        </div>
        <div className={`flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border ${serverOnline ? 'border-slate-700' : 'border-red-700/50'}`}>
          <div className="relative flex h-2.5 w-2.5">
            {serverOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${serverOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide ${serverOnline ? 'text-green-400' : 'text-red-400'}`}>
            {serverOnline ? 'Server Online' : 'Server Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}
