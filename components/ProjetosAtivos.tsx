import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import Link from 'next/link'

type Projeto = Database['public']['Tables']['projetos']['Row']

interface ProjetosAtivosProps {
  projetos: Projeto[]
}

export function ProjetosAtivos({ projetos }: ProjetosAtivosProps) {
  return (
    <Card title="Projetos Ativos">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Progresso</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Valor Previsto</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {projetos.map((projeto) => (
              <tr key={projeto.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <Link
                    href={`/projetos/${projeto.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {projeto.nome}
                  </Link>
                  {projeto.descricao && (
                    <p className="text-xs text-gray-500 mt-1">{projeto.descricao}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${projeto.progresso || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {projeto.progresso || 0}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {formatCurrency(Number(projeto.valor_previsto) || 0)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {projeto.data_fim_prevista ? formatDate(projeto.data_fim_prevista) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

