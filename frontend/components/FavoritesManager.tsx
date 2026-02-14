'use client'

import React, { useState } from 'react'
import { Star, StarOff, Settings, X } from 'lucide-react'
import { useFavorites } from '@/contexts/FavoritesContext'

interface FavoritesManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function FavoritesManager({ isOpen, onClose }: FavoritesManagerProps) {
  const { availableCryptos, favorites, addToFavorites, removeFromFavorites, isFavorite } = useFavorites()

  if (!isOpen) return null

  const handleToggleFavorite = (symbol: string) => {
    if (isFavorite(symbol)) {
      removeFromFavorites(symbol)
    } else {
      addToFavorites(symbol)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-crypto-blue" />
            <h2 className="text-lg font-semibold">즐겨찾기 관리</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-4">
            네비게이션 바에 표시할 암호화폐를 선택하세요
          </p>

          {availableCryptos.map((crypto) => {
            const isCurrentlyFavorite = isFavorite(crypto.symbol)
            
            return (
              <div
                key={crypto.symbol}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-crypto-blue rounded-full flex items-center justify-center text-sm font-bold">
                    {crypto.displaySymbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{crypto.name}</div>
                    <div className="text-sm text-gray-400">{crypto.displaySymbol}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFavorite(crypto.symbol)}
                  className={`p-2 rounded-lg transition-colors ${
                    isCurrentlyFavorite
                      ? 'bg-crypto-gold text-dark-bg hover:bg-yellow-500'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  }`}
                >
                  {isCurrentlyFavorite ? (
                    <Star className="w-4 h-4 fill-current" />
                  ) : (
                    <StarOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            선택된 즐겨찾기: {favorites.length}개
          </div>
          {favorites.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {favorites.map((symbol) => {
                const crypto = availableCryptos.find(c => c.symbol === symbol)
                return crypto ? (
                  <span
                    key={symbol}
                    className="px-2 py-1 bg-crypto-blue text-xs rounded-full"
                  >
                    {crypto.displaySymbol}
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-crypto-blue hover:bg-blue-600 rounded-lg transition-colors"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}