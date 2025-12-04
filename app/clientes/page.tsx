'use client'

import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Plus, Filter, X } from 'lucide-react'
import { ClientesTable } from '@/components/ClientesTable'
import { ClientesKanban } from '@/components/ClientesKanban'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { ClienteModal } from '@/components/modals/ClienteModal'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'

type Cliente = Database['public']['Tables']['clientes']['Row']
type Grupo = Database['public']['Tables']['grupos']['Row']

type ClienteComGrupos = Cliente & {
  grupos?: Array<{
    grupos: Grupo
    data_saida?: string | null
  }>
}

type ViewMode = 'lista' | 'kanban'

const STORAGE_VIEW_KEY = 'clientes_view_mode'

export default function ClientesPage() {
  // Verificar assinatura ativa (bloqueia acesso se não tiver)
  const { loading: loadingAssinatura } = useAssinaturaAtiva()
  
  const [clientes, setClientes] = useState<ClienteComGrupos[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_VIEW_KEY)
      return (saved === 'lista' || saved === 'kanban') ? saved : 'lista'
    }
    return 'lista'
  })

  async function loadClientes() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        clientes_grupos (
          grupos (*),
          data_saida
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Transformar os dados para o formato esperado
      const clientesComGrupos = data.map(cliente => ({
        ...cliente,
        grupos: (cliente.clientes_grupos as any[])?.filter((cg: any) => !cg.data_saida) || []
      }))
      setClientes(clientesComGrupos as any)
    }
    setLoading(false)
  }

  async function loadGrupos() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .in('status', ['ativo', 'em_andamento'])
      .order('nome')

    if (!error && data) {
      setGrupos(data)
    }
  }

  // Filtrar clientes baseado no grupo selecionado
  const clientesFiltrados = grupoFiltro
    ? clientes.filter(cliente => 
        cliente.grupos?.some(cg => cg.grupos?.id === grupoFiltro)
      )
    : clientes

  // Salvar preferência de visualização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_VIEW_KEY, viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    loadClientes()
    loadGrupos()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('clientes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
        },
        async () => {
          await loadClientes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-2">Gerencie seus clientes</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando clientes..." />
        </Card>
        <ClienteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadClientes}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-2">Gerencie seus clientes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-black ${
                  grupoFiltro
                    ? 'bg-primary-50 border-primary-300'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span className="text-sm">Filtro</span>
                {grupoFiltro && (
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
                          Grupo
                        </label>
                        <select
                          value={grupoFiltro || ''}
                          onChange={(e) => setGrupoFiltro(e.target.value || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        >
                          <option value="">Todos os grupos</option>
                          {grupos.map((grupo) => (
                            <option key={grupo.id} value={grupo.id}>
                              {grupo.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {grupoFiltro && (
                        <button
                          onClick={() => {
                            setGrupoFiltro(null)
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
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Novo Cliente
            </button>
          </div>
        </div>

      <Card>
        {viewMode === 'lista' ? (
          <ClientesTable 
            clientes={clientesFiltrados} 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : (
          <ClientesKanban 
            clientes={clientesFiltrados}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </Card>

      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadClientes}
      />
    </div>
  )
}
