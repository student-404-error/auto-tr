'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  serverOnline: boolean
}

export default function Sidebar({ serverOnline }: SidebarProps) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isStrategy = pathname === '/strategy'

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-background-dark border-b border-slate-800 z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">Q</div>
          <span className="font-bold text-lg tracking-tight">DataQuantLab</span>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card-dark border-t border-slate-800 z-50 flex justify-around py-3 px-2">
        <Link href="/" className={`flex flex-col items-center gap-1 ${isHome ? 'text-primary' : 'text-slate-500 hover:text-primary/70'}`}>
          <span className="material-icons text-2xl">dashboard</span>
          <span className="text-xxs font-medium uppercase tracking-wider">Dash</span>
        </Link>
        <Link href="/strategy" className={`flex flex-col items-center gap-1 ${isStrategy ? 'text-primary' : 'text-slate-500 hover:text-primary/70'}`}>
          <span className="material-icons text-2xl">candlestick_chart</span>
          <span className="text-xxs font-medium uppercase tracking-wider">Strats</span>
        </Link>
        <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-primary/70">
          <span className="material-icons text-2xl">history</span>
          <span className="text-xxs font-medium uppercase tracking-wider">Backtest</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-primary/70">
          <span className="material-icons text-2xl">settings</span>
          <span className="text-xxs font-medium uppercase tracking-wider">Config</span>
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-card-dark border-r border-slate-800 h-screen sticky top-0 py-6 px-4 justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">Q</div>
            <span className="font-bold text-lg tracking-tight hidden lg:block text-white">DataQuantLab</span>
          </div>
          <nav className="flex flex-col gap-2">
            <Link href="/" className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isHome ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span className="material-icons">dashboard</span>
              <span className="hidden lg:block font-medium">Overview</span>
            </Link>
            <Link href="/strategy" className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isStrategy ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span className="material-icons">candlestick_chart</span>
              <span className="hidden lg:block font-medium">Active Strategies</span>
            </Link>
            <a className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" href="#">
              <span className="material-icons">analytics</span>
              <span className="hidden lg:block font-medium">Analytics</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" href="#">
              <span className="material-icons">terminal</span>
              <span className="hidden lg:block font-medium">Logs</span>
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-card-darker rounded-lg border border-slate-800 hidden lg:block">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase">System</span>
              <span className={`text-xs font-bold ${serverOnline ? 'text-green-400' : 'text-red-400'}`}>
                {serverOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${serverOnline ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: serverOnline ? '100%' : '0%' }}></div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
