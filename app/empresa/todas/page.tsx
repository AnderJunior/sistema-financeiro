'use client'

import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'
import { Plus, ArrowUpRight, ArrowDownRight, Calendar, AlertCircle } from 'lucide-react'
import { FinanceiroTable } from '@/components/FinanceiroTable'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { LancamentoModal } from '@/components/modals/LancamentoModal'

type Cliente = Database['public']['Tables']['clientes']['Row']

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  clientes?: Cliente | null
}

type ContaFinanceira = Database['public']['Tables']['contas_financeiras']['Row']
type Transferencia = Database['public']['Tables']['transferencias_bancarias']['Row'] & {
  banco_origem?: ContaFinanceira | null
  banco_recebedor?: ContaFinanceira | null
}

export default function TodasPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [totalEntradas, setTotalEntradas] = useState(0)
  const [totalSaidas, setTotalSaidas] = useState(0)
  const [previstoMes, setPrevistoMes] = useState(0)
  const [atrasados, setAtrasados] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function loadData() {
    const supabase = createClient()
    
    // Buscar dados do mês atual
    const hoje = new Date()
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

    // Buscar todos os dados em paralelo
    const [entradasResult, saidasResult, previstoMesResult, atrasadosResult, lancamentosResult, transferenciasResult] = await Promise.all([
      supabase
        .from('financeiro_lancamentos')
        .select('valor')
        .eq('tipo', 'entrada')
        .eq('status', 'pago')
        .gte('data_competencia', primeiroDiaMes.toISOString().split('T')[0])
        .lte('data_competencia', ultimoDiaMes.toISOString().split('T')[0]),
      supabase
        .from('financeiro_lancamentos')
        .select('valor')
        .eq('tipo', 'saida')
        .eq('status', 'pago')
        .gte('data_competencia', primeiroDiaMes.toISOString().split('T')[0])
        .lte('data_competencia', ultimoDiaMes.toISOString().split('T')[0]),
      // Previsto para o Mês: todos os lançamentos com vencimento no mês atual
      supabase
        .from('financeiro_lancamentos')
        .select('valor, tipo')
        .not('data_vencimento', 'is', null)
        .gte('data_vencimento', primeiroDiaMes.toISOString().split('T')[0])
        .lte('data_vencimento', ultimoDiaMes.toISOString().split('T')[0]),
      // Atrasados: buscar todos os lançamentos para filtrar depois
      supabase
        .from('financeiro_lancamentos')
        .select('valor, status, data_vencimento')
        .neq('status', 'cancelado'),
      supabase
        .from('financeiro_lancamentos')
        .select(`
          *,
          clientes(id, nome),
          financeiro_categorias(id, nome)
        `)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('transferencias_bancarias')
        .select(`
          *,
          banco_origem:contas_financeiras!banco_origem_id(*),
          banco_recebedor:contas_financeiras!banco_recebedor_id(*)
        `)
        .order('data_transferencia', { ascending: false })
    ])

    const entradas = entradasResult.data || []
    const saidas = saidasResult.data || []
    const previstos = previstoMesResult.data || []
    const atrasadosData = atrasadosResult.data || []
    
    setTotalEntradas(entradas.reduce((acc, item) => acc + Number(item.valor), 0))
    setTotalSaidas(saidas.reduce((acc, item) => acc + Number(item.valor), 0))
    
    // Calcular previsto para o mês (soma de entradas menos saídas previstas)
    const previstoEntradasValor = previstos
      .filter((item: any) => item.tipo === 'entrada')
      .reduce((acc: number, item: any) => acc + Number(item.valor), 0)
    const previstoSaidasValor = previstos
      .filter((item: any) => item.tipo === 'saida')
      .reduce((acc: number, item: any) => acc + Number(item.valor), 0)
    setPrevistoMes(previstoEntradasValor - previstoSaidasValor)
    
    // Calcular atrasados: filtrar apenas os que realmente estão atrasados
    const hojeStr = hoje.toISOString().split('T')[0]
    const atrasadosFiltrados = atrasadosData.filter((item: any) => {
      // Se tem status em_atraso, está atrasado
      if (item.status === 'em_atraso') return true
      // Se tem vencimento passado e não está pago, está atrasado
      if (item.data_vencimento) {
        const vencimentoStr = item.data_vencimento.split('T')[0]
        if (vencimentoStr < hojeStr && item.status !== 'pago') return true
      }
      return false
    })
    setAtrasados(atrasadosFiltrados.reduce((acc: number, item: any) => acc + Number(item.valor), 0))
    
    if (lancamentosResult.data) {
      setLancamentos(lancamentosResult.data)
    }

    if (transferenciasResult.data) {
      setTransferencias(transferenciasResult.data as Transferencia[])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('financeiro_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financeiro_lancamentos',
        },
        async () => {
          await loadData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transferencias_bancarias',
        },
        async () => {
          await loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const saldo = totalEntradas - totalSaidas

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-2">Controle de entradas e saídas</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Lançamento
          </button>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando lançamentos..." />
        </Card>
        <LancamentoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadData}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600 mt-2">Controle de entradas e saídas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Lançamento
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Entradas do Mês"
          value={formatCurrency(totalEntradas)}
          icon={ArrowUpRight}
          iconColor="text-green-600"
        />
        <StatCard
          title="Saídas do Mês"
          value={formatCurrency(totalSaidas)}
          icon={ArrowDownRight}
          iconColor="text-red-600"
        />
        <StatCard
          title="Saldo do Mês"
          value={formatCurrency(saldo)}
          iconColor={saldo >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          title="Previsto para o Mês"
          value={formatCurrency(previstoMes)}
          icon={Calendar}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Atrasados"
          value={formatCurrency(atrasados)}
          icon={AlertCircle}
          iconColor="text-orange-600"
        />
      </div>

      {/* Tabela de Lançamentos */}
      <Card>
        <FinanceiroTable lancamentos={lancamentos} transferencias={transferencias} />
      </Card>

      <LancamentoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}







