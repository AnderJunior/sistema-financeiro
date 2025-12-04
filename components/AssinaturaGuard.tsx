'use client'

import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'
import { Loading } from '@/components/ui/Loading'

interface AssinaturaGuardProps {
  children: React.ReactNode
  pageName?: string
}

/**
 * Componente que protege páginas verificando se o usuário tem assinatura ativa
 * Se não tiver, redireciona automaticamente para google.com
 */
export function AssinaturaGuard({ children, pageName = 'página' }: AssinaturaGuardProps) {
  const { loading, hasAssinaturaAtiva, assinaturaInfo } = useAssinaturaAtiva()


  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="p-8">
        <Loading isLoading={true} message="Verificando permissões de acesso..." />
      </div>
    )
  }

  // Se não tem assinatura ativa, o hook já redirecionou
  // Mas podemos mostrar uma mensagem enquanto redireciona
  if (hasAssinaturaAtiva === false) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    )
  }

  // Se tem assinatura ativa, renderizar o conteúdo
  return <>{children}</>
}

