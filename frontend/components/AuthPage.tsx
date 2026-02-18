'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setAdminKey, validateAdminKey, isAuthenticated } from '@/utils/auth'

export default function AuthPage() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already authenticated, go straight to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) {
      setError('Please enter an access key')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const isValid = await validateAdminKey(key.trim())
      if (isValid) {
        setAdminKey(key.trim())
        router.push('/')
      } else {
        setError('Invalid access key. Attempt logged.')
      }
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-navy-bg font-display flex flex-col items-center justify-center p-6 text-slate-200">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-electric-blue flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
            Q
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">DataQuantLab</span>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-card-navy border border-slate-800 rounded-card p-8 shadow-2xl relative overflow-hidden">
          {/* Top gradient line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-blue to-transparent opacity-50"></div>

          {/* Lock icon + title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-2xl">lock</span>
            </div>
            <h2 className="text-lg font-semibold text-white tracking-wide">System Authentication</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Restricted Research Node</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1"
                htmlFor="admin_key"
              >
                Admin_Key
              </label>
              <div className="relative group">
                <input
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-4 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-electric-blue focus:border-electric-blue transition-all font-mono text-sm"
                  id="admin_key"
                  name="admin_key"
                  placeholder="Enter restricted access key..."
                  type="password"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value)
                    setError(null)
                  }}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 ml-1 mt-1">{error}</p>
              )}
            </div>

            <button
              className="w-full bg-electric-blue hover:bg-blue-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="text-sm uppercase tracking-widest">Access Terminal</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Info footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-slate-600 text-sm mt-0.5">info</span>
              <p className="text-[11px] leading-relaxed text-slate-500 italic">
                Restricted Access Environment. Unauthorized entry attempts are logged and reported to the system security protocol.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom status */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-widest">Quantum Engine v4.0.2</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
              Encrypted Connection Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
