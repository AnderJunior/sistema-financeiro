'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ScrollToHash() {
  const pathname = usePathname()

  useEffect(() => {
    // Aguardar um pouco para garantir que o DOM está renderizado
    const timer = setTimeout(() => {
      const hash = window.location.hash
      if (hash) {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
