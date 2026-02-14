'use client'

import { useState } from 'react'
import { Bitcoin, Activity } from 'lucide-react'
import NavigationPriceTicker from './NavigationPriceTicker'
import FavoritesManager from './FavoritesManager'

export default function Header() {
  const [showFavoritesManager, setShowFavoritesManager] = useState(false)

  const handlePriceClick = (symbol: string) => {
    // TODO: Navigate to coin detail view
    console.log(`Navigate to ${symbol} detail view`)
  }

  const handleSettingsClick = () => {
    setShowFavoritesManager(true)
  }

  return (
    <>
      <header className="bg-dark-card border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-crypto-blue rounded-lg">
                <Bitcoin className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Advanced Trading Dashboard</h1>
                <p className="text-gray-400 text-sm">다중 암호화폐 자동매매 시스템</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Navigation Price Ticker */}
              <NavigationPriceTicker 
                onPriceClick={handlePriceClick}
                onSettingsClick={handleSettingsClick}
              />
              
              <div className="flex items-center space-x-2 text-crypto-green">
                <Activity className="w-4 h-4" />
                <span className="text-sm">실시간 연결됨</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Favorites Manager Modal */}
      <FavoritesManager 
        isOpen={showFavoritesManager}
        onClose={() => setShowFavoritesManager(false)}
      />
    </>
  )
}