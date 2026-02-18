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

// 신호 중복 판별용 키 생성 (타임스탬프 + 메시지 앞 40자)
function signalKey(s: Signal): string {
  return `${s.timestamp}|${(s.message || '').slice(0, 40)}`
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return timestamp
  }
}

function getLogStyle(signal: Signal): { text: string; highlight: boolean } {
  const msg = (signal.message || signal.signal || '').toLowerCase()
  const type = (signal.type || '').toLowerCase()

  if (type === 'error' || msg.includes('error')) return { text: 'text-red-400', highlight: false }
  if (type === 'warn') return { text: 'text-yellow-400', highlight: false }
  if (
    type === 'exec' ||
    msg.includes('decision: buy') ||
    msg.includes('decision: sell') ||
    msg.includes('buy signal') ||
    msg.includes('sell signal')
  )
    return { text: 'text-green-400 font-bold', highlight: true }
  if (type === 'signal') return { text: 'text-white font-semibold', highlight: true }
  if (type === 'info') return { text: 'text-blue-400', highlight: false }
  return { text: 'text-slate-400', highlight: false }
}

// 최대 누적 신호 수 (너무 많이 쌓이지 않도록)
const MAX_SIGNALS = 200

export default function LiveSignalLog() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isActive, setIsActive] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seenKeysRef = useRef<Set<string>>(new Set())
  const isFirstFetch = useRef(true)

  const fetchSignals = useCallback(async () => {
    try {
      const [signalData, statusData] = await Promise.allSettled([
        tradingApi.getRecentSignals(20),
        tradingApi.getTradingStatus(),
      ])

      if (statusData.status === 'fulfilled') {
        setIsActive(statusData.value.is_active || false)
      }

      if (signalData.status === 'fulfilled' && signalData.value.signals) {
        const incoming: Signal[] = signalData.value.signals

        if (isFirstFetch.current) {
          // 첫 fetch: 기존 신호 모두 세팅하고 seen에 등록
          isFirstFetch.current = false
          incoming.forEach((s) => seenKeysRef.current.add(signalKey(s)))
          setSignals(incoming)
        } else {
          // 이후 fetch: 처음 보는 신호만 앞에 누적
          const fresh = incoming.filter((s) => !seenKeysRef.current.has(signalKey(s)))
          if (fresh.length > 0) {
            fresh.forEach((s) => seenKeysRef.current.add(signalKey(s)))
            setSignals((prev) => {
              const merged = [...fresh, ...prev].slice(0, MAX_SIGNALS)
              return merged
            })
            setNewCount((c) => c + fresh.length)
          }
        }
      }
    } catch {
      // 에러 시 기존 신호 유지
    }
  }, [])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 30000)
    return () => clearInterval(interval)
  }, [fetchSignals])

  // 새 신호 뱃지: 3초 후 초기화
  useEffect(() => {
    if (newCount === 0) return
    const t = setTimeout(() => setNewCount(0), 3000)
    return () => clearTimeout(t)
  }, [newCount])

  // 새 신호 추가 시 맨 위로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [signals])

  return (
    <div className="bg-card-darker rounded-xl border border-slate-800 shadow-inner flex flex-col h-[480px] relative overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="font-mono text-xs font-bold text-slate-300 uppercase">Live Signal Log</span>
          {newCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              +{newCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono">
            {signals.length} entries
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
            {isActive ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Log Body */}
      <div ref={scrollRef} className="p-4 overflow-y-auto font-mono text-xs space-y-2.5 flex-1 scrollbar-hide">
        {signals.length === 0 ? (
          <div className="flex gap-3 text-slate-500 pt-2">
            <span className="min-w-[55px]">--:--:--</span>
            <span>Waiting for signals...</span>
          </div>
        ) : (
          signals.map((signal, i) => {
            const { text, highlight } = getLogStyle(signal)
            return (
              <div
                key={`${signalKey(signal)}-${i}`}
                className={`flex gap-3 ${highlight ? 'py-1 bg-primary/10 -mx-4 px-4 border-l-2 border-primary rounded-r' : ''}`}
              >
                <span className={`min-w-[55px] shrink-0 ${highlight ? 'text-primary' : 'text-slate-600'}`}>
                  {formatTime(signal.timestamp)}
                </span>
                <span className={`${text} break-all leading-relaxed`}>
                  {signal.message || signal.signal || signal.type}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-slate-800/30 border-t border-slate-800 flex items-center gap-2">
        <span className="text-primary font-bold text-xs">root@dql:~#</span>
        <div className="w-2 h-4 bg-slate-500 animate-pulse"></div>
      </div>
    </div>
  )
}
