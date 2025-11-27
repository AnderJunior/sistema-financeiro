'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  isLoading?: boolean
  fullScreen?: boolean
  message?: string
}

export function Loading({ isLoading, fullScreen = false, message }: LoadingProps) {
  if (!isLoading) return null

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          {message && (
            <p className="text-gray-600 font-medium">{message}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        {message && (
          <p className="text-sm text-gray-500">{message}</p>
        )}
      </div>
    </div>
  )
}








