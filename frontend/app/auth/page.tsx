'use client'

import { useState, useEffect } from 'react'
import AuthPage from '@/components/AuthPage'

export default function Auth() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-navy-bg">
        <div className="w-10 h-10 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return <AuthPage />
}
