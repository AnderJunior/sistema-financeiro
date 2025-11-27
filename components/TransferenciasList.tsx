'use client'

import { Card } from '@/components/ui/Card'
import { Database } from '@/types/database.types'
import { ArrowRight, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type Transferencia = Database['public']['Tables']['transferencias_bancarias']['Row'] & {
  banco_origem: Database['public']['Tables']['contas_financeiras']['Row']
  banco_recebedor: Database['public']['Tables']['contas_financeiras']['Row']
}

interface TransferenciasListProps {
  transferencias: Transferencia[]
}

export function TransferenciasList({ transferencias }: TransferenciasListProps) {
  if (transferencias.length === 0) {
    return (
      <Card title="Transferências Bancárias">
        <div className="text-center py-8 text-gray-500">
          Nenhuma transferência registrada
        </div>
      </Card>
    )
  }

  return (
    <Card title="Transferências Bancárias">
      <div className="space-y-3">
        {transferencias.map((transferencia) => (
          <div
            key={transferencia.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Conta de origem */}
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {transferencia.banco_origem?.nome || 'Conta não encontrada'}
                </div>
                <div className="text-xs text-gray-500">
                  {transferencia.banco_origem?.tipo === 'bancaria' && 'Bancária'}
                  {transferencia.banco_origem?.tipo === 'carteira_digital' && 'Carteira Digital'}
                  {transferencia.banco_origem?.tipo === 'caixa_fisico' && 'Caixa Físico'}
                </div>
              </div>

              {/* Seta e valor */}
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-5 h-5 text-primary-600" />
                <div className="text-lg font-bold text-primary-600">
                  {formatCurrency(transferencia.valor_enviado)}
                </div>
              </div>

              {/* Conta de destino */}
              <div className="flex-1 text-right">
                <div className="text-sm font-medium text-gray-900">
                  {transferencia.banco_recebedor?.nome || 'Conta não encontrada'}
                </div>
                <div className="text-xs text-gray-500">
                  {transferencia.banco_recebedor?.tipo === 'bancaria' && 'Bancária'}
                  {transferencia.banco_recebedor?.tipo === 'carteira_digital' && 'Carteira Digital'}
                  {transferencia.banco_recebedor?.tipo === 'caixa_fisico' && 'Caixa Físico'}
                </div>
              </div>
            </div>

            {/* Data e descrição */}
            <div className="ml-6 flex flex-col items-end gap-1 min-w-[200px]">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(transferencia.data_transferencia)}</span>
              </div>
              {transferencia.descricao && (
                <div className="text-xs text-gray-500 text-right max-w-[200px] truncate">
                  {transferencia.descricao}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}


