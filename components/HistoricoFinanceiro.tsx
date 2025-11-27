'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Database } from '@/types/database.types'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row']

interface HistoricoFinanceiroProps {
  clienteId: string
}

export function HistoricoFinanceiro({ clienteId }: HistoricoFinanceiroProps) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLancamentos() {
      const supabase = createClient()
      
      const { data } = await supabase
        .from('financeiro_lancamentos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_competencia', { ascending: false })
        .limit(20)

      if (data) {
        setLancamentos(data)
      }
      setLoading(false)
    }

    loadLancamentos()
  }, [clienteId])

  if (loading) {
    return (
      <Card title="Histórico Financeiro">
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      </Card>
    )
  }

  return (
    <Card title="Histórico Financeiro">
      {lancamentos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum lançamento financeiro encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {lancamentos.map((lancamento) => (
            <div
              key={lancamento.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {lancamento.tipo === 'entrada' ? (
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{lancamento.descricao}</p>
                  <p className="text-xs text-gray-600">{formatDate(lancamento.data_competencia)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  lancamento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {lancamento.tipo === 'entrada' ? '+' : '-'}
                  {formatCurrency(Number(lancamento.valor))}
                </p>
                <p className="text-xs text-gray-600">
                  {lancamento.status === 'pago' ? 'Pago' : 
                   lancamento.status === 'em_atraso' ? 'Atrasado' : 'Previsto'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

