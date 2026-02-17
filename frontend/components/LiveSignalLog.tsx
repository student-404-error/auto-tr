'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { tradingApi } from '@/utils/api'

interface Signal {
  timestamp: string
  type: string
  message: string
  signal?: string
  side?: string
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return timestamp
  }
}

function getLogClass(signal: Signal): string {
  const msg = (signal.message || signal.signal || '').toLowerCase()
  const type = (signal.type || '').toLowerCase()

  if (type === 'error' || msg.includes('error')) return 'text-red-400'
  if (type === 'warn' || msg.includes('warn') || msg.includes('spike')) return 'text-yellow-500'
  if (type === 'signal' || msg.includes('signal') || msg.includes('confirmed')) return 'text-white font-bold'
  if (type === 'exec' || msg.includes('exec') || msg.includes('buy') || msg.includes('sell')) return 'text-green-400'
  if (msg.includes('info') || msg.includes('rsi')) return 'text-blue-400'
  return 'text-slate-400 opacity-50'
}

function isHighlight(signal: Signal): boolean {
  const msg = (signal.message || signal.signal || '').toLowerCase()
  return msg.includes('signal') || msg.includes('confirmed')
}

export default function LiveSignalLog() {
  const [signals, setSignals] = useState<Signal[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchSignals = useCallback(async () => {
    try {
      const data = await tradingApi.getRecentSignals(20)
      if (data.signals && data.signals.length > 0) {
        setSignals(data.signals)
      }
    } catch {
      // Keep existing signals on error
    }
  }, [])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 10000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [signals])

  return (
    <div className="bg-card-darker rounded-xl border border-slate-800 shadow-inner flex flex-col h-[400px] lg:h-full relative overflow-hidden">
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-mono text-xs font-bold text-slate-300 uppercase">Live Signal Log</span>
        </div>
        <span className="material-icons text-slate-600 text-xs cursor-pointer hover:text-white">filter_list</span>
      </div>
      <div ref={scrollRef} className="p-4 overflow-y-auto font-mono text-xs space-y-3 flex-1 scrollbar-hide">
        {signals.length === 0 ? (
          <div className="flex gap-3 text-slate-400 opacity-50">
            <span className="text-slate-600 min-w-[50px]">--:--:--</span>
            <span>Waiting for signals...</span>
          </div>
        ) : (
          signals.map((signal, i) => {
            const highlight = isHighlight(signal)
            return (
              <div
                key={i}
                className={`flex gap-3 ${highlight ? 'py-1 bg-primary/10 -mx-4 px-4 border-l-2 border-primary' : ''}`}
              >
                <span className={`min-w-[50px] ${highlight ? 'text-primary' : 'text-slate-500'}`}>
                  {formatTime(signal.timestamp)}
                </span>
                <span className={getLogClass(signal)}>
                  {signal.message || signal.signal || signal.type}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div className="p-2 bg-slate-800/30 border-t border-slate-800 flex items-center gap-2">
        <span className="text-primary font-bold text-xs">root@dql:~#</span>
        <div className="w-2 h-4 bg-slate-500 animate-pulse"></div>
      </div>
    </div>
  )
}
