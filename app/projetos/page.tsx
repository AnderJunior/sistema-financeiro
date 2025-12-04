'use client'

import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Filter, X } from 'lucide-react'
import { ProjetosTable } from '@/components/ProjetosTable'
import { ProjetosKanban } from '@/components/ProjetosKanban'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  clientes?: Database['public']['Tables']['clientes']['Row']
}

type ViewMode = 'lista' | 'kanban'

const STORAGE_VIEW_KEY = 'projetos_view_mode'

export default function ProjetosPage() {
  // Verificar assinatura ativa (bloqueia acesso se não tiver)
  const { loading: loadingAssinatura } = useAssinaturaAtiva()
  
  const [projetos, setProjetos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [clienteFiltro, setClienteFiltro] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_VIEW_KEY)
      return (saved === 'lista' || saved === 'kanban') ? saved : 'lista'
    }
    return 'lista'
  })
  const [clientes, setClientes] = useState<Database['public']['Tables']['clientes']['Row'][]>([])

  async function loadProjetos() {
    const supabase = createClient()
    
    let query = supabase
      .from('financeiro_lancamentos')
      .select(`
        *,
        servicos (*),
        clientes (*)
      `)
      .not('servico_id', 'is', null)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (!error && data) {
      // Mostrar TODOS os projetos, mesmo que sejam do mesmo serviço/cliente
      setProjetos(data as Lancamento[])
    }
    setLoading(false)
  }

  async function loadClientes() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome')

    if (!error && data) {
      setClientes(data)
    }
  }

  // Filtrar projetos baseado no cliente selecionado
  const projetosFiltrados = clienteFiltro
    ? projetos.filter(projeto => projeto.cliente_id === clienteFiltro)
    : projetos

  // Salvar preferência de visualização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_VIEW_KEY, viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    loadProjetos()
    loadClientes()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('projetos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financeiro_lancamentos',
          filter: 'servico_id=not.is.null'
        },
        async () => {
          await loadProjetos()
        }
      )
      .subscribe()

    // Listener para eventos customizados (quando componentes filhos atualizam)
    const handleCustomEvent = async () => {
      await loadProjetos()
    }

    window.addEventListener('projetoStatusChanged', handleCustomEvent)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('projetoStatusChanged', handleCustomEvent)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projetos</h1>
            <p className="text-gray-600 mt-2">Gerencie todas as demandas e serviços dos clientes</p>
          </div>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando projetos..." />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-600 mt-2">Gerencie todas as demandas e serviços dos clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-black ${
                clienteFiltro
                  ? 'bg-primary-50 border-primary-300'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="text-sm">Filtro</span>
              {clienteFiltro && (
                <span className="ml-1 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                  1
                </span>
              )}
            </button>
            {isFilterOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cliente
                      </label>
                      <select
                        value={clienteFiltro || ''}
                        onChange={(e) => setClienteFiltro(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="">Todos os clientes</option>
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {clienteFiltro && (
                      <button
                        onClick={() => {
                          setClienteFiltro(null)
                          setIsFilterOpen(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Card>
        {viewMode === 'lista' ? (
          <ProjetosTable 
            projetos={projetosFiltrados} 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : (
          <ProjetosKanban 
            projetos={projetosFiltrados}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </Card>
    </div>
  )
}


