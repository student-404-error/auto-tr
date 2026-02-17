'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background-dark">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return <Dashboard />
}
