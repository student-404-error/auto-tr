'use client'

import { useState } from 'react'

interface Props {
  apiBase?: string
  onStatusChanged?: () => Promise<void> | void
}

const DEFAULT_ENDPOINT = '/api/trading'
const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.dataquantlab.com'

export default function AutoTradeControls({
  apiBase = DEFAULT_API_BASE,
  onStatusChanged,
}: Props) {
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const callApi = async (path: 'start' | 'stop') => {
    setLoading(true)
    setMessage(null)
    try {
      const normalizedBase = apiBase.replace(/\/+$/, '')
      const res = await fetch(`${normalizedBase}${DEFAULT_ENDPOINT}/${path}`, {
        method: 'POST',
        headers: {
          ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || res.statusText)
      }
      setMessage(data.message || `${path} 요청 성공`)
      if (onStatusChanged) {
        await onStatusChanged()
      }
    } catch (err: any) {
      setMessage(err.message || '요청 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">자동매매 컨트롤</h3>
        <span className="text-xs text-gray-400">X-API-KEY 필요</span>
      </div>
      <div className="space-y-3">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="ADMIN_API_KEY 입력"
          className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm"
        />
        <div className="flex gap-3">
          <button
            onClick={() => callApi('start')}
            disabled={loading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-3 py-2 rounded-md transition disabled:opacity-60"
          >
            자동매매 시작
          </button>
          <button
            onClick={() => callApi('stop')}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-2 rounded-md transition disabled:opacity-60"
          >
            자동매매 중지
          </button>
        </div>
        {message && (
          <div className="text-sm text-gray-200 bg-gray-900 border border-gray-800 rounded-md px-3 py-2">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
