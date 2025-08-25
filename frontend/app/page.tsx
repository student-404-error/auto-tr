'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'
import { TradingProvider } from '@/contexts/TradingContext'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <TradingProvider>
      <main className="min-h-screen bg-dark-bg">
        <Dashboard />
      </main>
    </TradingProvider>
  )
}