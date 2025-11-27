'use client'

import { Card } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

// @ts-ignore - react-apexcharts não tem tipos corretos para dynamic import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface ValorPorTipoServicoChartProps {
  dateRange: { start: Date | null; end: Date | null }
}

export function ValorPorTipoServicoChart({ dateRange }: ValorPorTipoServicoChartProps) {
  const [chartData, setChartData] = useState<{ tipo: string; valor: number; porcentagem: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [totalGeral, setTotalGeral] = useState(0)

  useEffect(() => {
    async function loadData() {
      if (!dateRange.start || !dateRange.end) {
        setLoading(false)
        return
      }

      const supabase = createClient()
      
      const startDate = new Date(dateRange.start)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999)

      // Buscar lançamentos com serviço no período selecionado (independente do status)
      const { data: lancamentos } = await supabase
        .from('financeiro_lancamentos')
        .select(`
          valor,
          servico_id,
          servicos (*)
        `)
        .eq('tipo', 'entrada')
        .not('servico_id', 'is', null)
        .gte('data_competencia', startDate.toISOString().split('T')[0])
        .lte('data_competencia', endDate.toISOString().split('T')[0])

      // Agrupar por tipo de serviço
      const tiposServico: Record<string, number> = {
        'recorrente': 0,
        'assinatura': 0,
        'avulso': 0,
        'projeto': 0
      }

      let total = 0

      if (lancamentos) {
        lancamentos.forEach((lancamento: any) => {
          const valor = Number(lancamento.valor) || 0
          const tipoServico = lancamento.servicos?.tipo || 'avulso'
          
          if (tiposServico.hasOwnProperty(tipoServico)) {
            tiposServico[tipoServico] += valor
          } else {
            tiposServico['avulso'] += valor
          }
          
          total += valor
        })
      }

      // Calcular porcentagens e preparar dados para o gráfico
      const dadosGrafico = Object.entries(tiposServico)
        .map(([tipo, valor]) => ({
          tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
          valor,
          porcentagem: total > 0 ? Math.round((valor / total) * 100) : 0
        }))
        .filter(item => item.valor > 0) // Apenas tipos com valor > 0
        .sort((a, b) => b.valor - a.valor) // Ordenar do maior para o menor

      setChartData(dadosGrafico)
      setTotalGeral(total)
      setLoading(false)
    }

    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('valor_por_tipo_servico_changes')
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dateRange])

  // Inverter ordem: valores menores ficam nos anéis internos, maiores nos externos
  const chartDataInvertido = [...chartData].reverse()
  const series = chartDataInvertido.map(item => item.porcentagem)
  const labels = chartDataInvertido.map(item => item.tipo)

  const options = {
    chart: {
      height: 315,
      type: 'radialBar' as const,
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '60%',
        },
        track: {
          background: '#e5e7eb',
          strokeWidth: '40',
          margin: 5,
        },
        dataLabels: {
          name: {
            fontSize: '22px',
            color: '#6b7280',
            offsetY: -10,
          },
          value: {
            fontSize: '16px',
            color: '#1f2937',
            offsetY: 16,
            formatter: function(val: number) {
              return val + '%'
            }
          },
          total: {
            show: true,
            label: 'Total',
            fontSize: '16px',
            fontWeight: 600,
            color: '#6b7280',
            formatter: function() {
              return formatCurrency(totalGeral)
            }
          }
        }
      }
    },
    labels: labels,
    colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
    tooltip: {
      enabled: true,
      custom: function({ series, seriesIndex, w }: any) {
        const index = seriesIndex
        const tipo = chartDataInvertido[index]?.tipo || ''
        const valorReal = chartDataInvertido[index]?.valor || 0
        
        return `
          <div style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">
              ${tipo}
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #059669;">
              ${formatCurrency(valorReal)}
            </div>
          </div>
        `
      }
    },
    legend: {
      show: true,
      floating: false,
      fontSize: '14px',
      position: 'bottom' as const,
      offsetX: 0,
      offsetY: 0,
      labels: {
        useSeriesColors: true,
      },
      markers: {
        size: 0
      },
      formatter: function(seriesName: string) {
        return seriesName
      },
      itemMargin: {
        vertical: 3
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 300
        },
        legend: {
          show: false
        }
      }
    }]
  }

  if (loading) {
    return (
      <Card title="Valor Total por Tipo de Serviço">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Carregando gráfico...</div>
        </div>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card title="Valor Total por Tipo de Serviço">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Nenhum dado disponível para o período selecionado</div>
        </div>
      </Card>
    )
  }

  const ChartComponent = Chart as any

  return (
    <Card title="Valor Total por Tipo de Serviço">
      <ChartComponent
        options={options}
        series={series}
        type="radialBar"
        height={315}
      />
    </Card>
  )
}
