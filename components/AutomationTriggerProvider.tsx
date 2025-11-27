// components/AutomationTriggerProvider.tsx

'use client'

import { useEffect } from 'react'
import { TriggerManager } from '@/lib/automations/triggerManager'

/**
 * Componente que inicializa o sistema de triggers de automação
 * Deve ser usado no nível raiz da aplicação
 */
export function AutomationTriggerProvider() {
  useEffect(() => {
    // Inicializar o trigger manager apenas no cliente
    if (typeof window !== 'undefined') {
      console.log('[AutomationTriggerProvider] Inicializando trigger manager...')
      const manager = TriggerManager.getInstance()
      
      // Pequeno delay para garantir que o Supabase está pronto
      setTimeout(() => {
        manager.initialize().catch((error) => {
          console.error('[AutomationTriggerProvider] Erro ao inicializar:', error)
        })
      }, 1000)

      // Cleanup ao desmontar
      return () => {
        console.log('[AutomationTriggerProvider] Limpando trigger manager...')
        manager.cleanup().catch(console.error)
      }
    }
  }, [])

  return null
}

