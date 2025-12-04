'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AssinaturaInfo {
  id: string
  status: string
  plano_nome: string | null
  data_vencimento: string | null
}

interface AssinaturaContextType {
  loading: boolean
  hasAssinaturaAtiva: boolean | null
  assinaturaInfo: AssinaturaInfo | null
  refetch: () => Promise<void>
}

const AssinaturaContext = createContext<AssinaturaContextType | undefined>(undefined)

// Cache global para evitar múltiplas requisições
let cache: {
  data: AssinaturaContextType | null
  timestamp: number
  checking: boolean
} = {
  data: null,
  timestamp: 0,
  checking: false,
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function AssinaturaProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [hasAssinaturaAtiva, setHasAssinaturaAtiva] = useState<boolean | null>(null)
  const [assinaturaInfo, setAssinaturaInfo] = useState<AssinaturaInfo | null>(null)
  const checkingRef = useRef(false)

  const verificarAssinatura = async (force = false) => {
    // Evitar múltiplas verificações simultâneas
    if (checkingRef.current && !force) {
      return
    }

    // Verificar cache
    const now = Date.now()
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      setLoading(false)
      setHasAssinaturaAtiva(cache.data.hasAssinaturaAtiva)
      setAssinaturaInfo(cache.data.assinaturaInfo)
      return
    }

    // Se já está verificando, aguardar
    if (cache.checking && !force) {
      // Aguardar até 5 segundos para a verificação terminar
      let attempts = 0
      while (cache.checking && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
        if (cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION) {
          setLoading(false)
          setHasAssinaturaAtiva(cache.data.hasAssinaturaAtiva)
          setAssinaturaInfo(cache.data.assinaturaInfo)
          return
        }
      }
    }

    checkingRef.current = true
    cache.checking = true

    try {
      const supabase = createClient()
      
      // Obter usuário logado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        const result = {
          loading: false,
          hasAssinaturaAtiva: false,
          assinaturaInfo: null,
        }
        cache.data = result
        cache.timestamp = Date.now()
        cache.checking = false
        checkingRef.current = false
        
        setLoading(false)
        setHasAssinaturaAtiva(false)
        setAssinaturaInfo(null)
        return
      }

      // Verificar assinatura ativa (ativo ou teste)
      const { data: assinante, error: assinaturaError } = await supabase
        .from('assinantes')
        .select('id, status, plano_nome, data_vencimento')
        .eq('user_id', user.id)
        .in('status', ['ativo', 'teste'])
        .maybeSingle()

      if (assinaturaError) {
        // Erro PGRST116 = nenhum registro encontrado (não tem assinatura ativa)
        if (assinaturaError.code === 'PGRST116') {
          const result = {
            loading: false,
            hasAssinaturaAtiva: false,
            assinaturaInfo: null,
          }
          cache.data = result
          cache.timestamp = Date.now()
          cache.checking = false
          checkingRef.current = false
          
          setHasAssinaturaAtiva(false)
          setAssinaturaInfo(null)
          setLoading(false)
          // Redirecionar para google.com
          window.location.href = 'https://google.com'
          return
        }

        const result = {
          loading: false,
          hasAssinaturaAtiva: false,
          assinaturaInfo: null,
        }
        cache.data = result
        cache.timestamp = Date.now()
        cache.checking = false
        checkingRef.current = false
        
        setHasAssinaturaAtiva(false)
        setAssinaturaInfo(null)
        setLoading(false)
        // Redirecionar para google.com em caso de erro
        window.location.href = 'https://google.com'
        return
      }

      if (!assinante) {
        const result = {
          loading: false,
          hasAssinaturaAtiva: false,
          assinaturaInfo: null,
        }
        cache.data = result
        cache.timestamp = Date.now()
        cache.checking = false
        checkingRef.current = false
        
        setHasAssinaturaAtiva(false)
        setAssinaturaInfo(null)
        setLoading(false)
        // Redirecionar para google.com
        window.location.href = 'https://google.com'
        return
      }

      // Tem assinatura ativa
      const info: AssinaturaInfo = {
        id: assinante.id,
        status: assinante.status || '',
        plano_nome: assinante.plano_nome,
        data_vencimento: assinante.data_vencimento,
      }
      
      const result = {
        loading: false,
        hasAssinaturaAtiva: true,
        assinaturaInfo: info,
      }
      
      cache.data = result
      cache.timestamp = Date.now()
      cache.checking = false
      checkingRef.current = false
      
      setHasAssinaturaAtiva(true)
      setAssinaturaInfo(info)
      setLoading(false)
    } catch (error: any) {
      const result = {
        loading: false,
        hasAssinaturaAtiva: false,
        assinaturaInfo: null,
      }
      cache.data = result
      cache.timestamp = Date.now()
      cache.checking = false
      checkingRef.current = false
      
      setHasAssinaturaAtiva(false)
      setAssinaturaInfo(null)
      setLoading(false)
      // Redirecionar para google.com em caso de erro inesperado
      window.location.href = 'https://google.com'
    }
  }

  useEffect(() => {
    // Verificar assinatura apenas uma vez ao montar o provider
    // O cache evitará múltiplas requisições mesmo se múltiplas páginas carregarem
    verificarAssinatura()
  }, [])

  const refetch = async () => {
    cache.data = null
    cache.timestamp = 0
    await verificarAssinatura(true)
  }

  return (
    <AssinaturaContext.Provider
      value={{
        loading,
        hasAssinaturaAtiva,
        assinaturaInfo,
        refetch,
      }}
    >
      {children}
    </AssinaturaContext.Provider>
  )
}

export function useAssinaturaAtiva() {
  const context = useContext(AssinaturaContext)
  
  if (context === undefined) {
    // Fallback se não estiver dentro do Provider
    return {
      loading: false,
      hasAssinaturaAtiva: null,
      assinaturaInfo: null,
      refetch: async () => {},
    }
  }
  
  return context
}

