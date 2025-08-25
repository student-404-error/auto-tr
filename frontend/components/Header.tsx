'use client'

import { Bitcoin, Activity, Settings } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-dark-card border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-crypto-blue rounded-lg">
              <Bitcoin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bitcoin Auto-Trading</h1>
              <p className="text-gray-400 text-sm">자동매매 대시보드</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-crypto-green">
              <Activity className="w-4 h-4" />
              <span className="text-sm">실시간 연결됨</span>
            </div>
            
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}