import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import Link from 'next/link'

type Projeto = Database['public']['Tables']['projetos']['Row']

interface ProjetosConcluidosProps {
  projetos: Projeto[]
}

export function ProjetosConcluidos({ projetos }: ProjetosConcluidosProps) {
  return (
    <Card title="Projetos Concluídos">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Início</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Término</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Valor Previsto</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Valor Final</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {projetos.map((projeto) => {
              const resultado = Number(projeto.valor_fechado) - Number(projeto.valor_previsto)
              return (
                <tr key={projeto.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link
                      href={`/projetos/${projeto.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {projeto.nome}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(projeto.data_inicio)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {projeto.data_fim_real ? formatDate(projeto.data_fim_real) : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatCurrency(Number(projeto.valor_previsto))}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatCurrency(Number(projeto.valor_fechado))}
                  </td>
                  <td className={`py-3 px-4 text-sm font-semibold ${
                    resultado >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

