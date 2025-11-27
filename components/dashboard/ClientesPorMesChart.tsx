'use client'

import { Card } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import dynamic from 'next/dynamic'

// @ts-ignore - react-apexcharts não tem tipos corretos para dynamic import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export function ClientesPorMesChart() {
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Buscar últimos 6 meses
      const meses = []
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i)
        meses.push({
          mes: format(date, 'MMM', { locale: ptBR }),
          mesNum: date.getMonth() + 1,
          ano: date.getFullYear(),
        })
      }

      const chartData = await Promise.all(
        meses.map(async (m) => {
          const primeiroDia = new Date(m.ano, m.mesNum - 1, 1)
          const ultimoDia = new Date(m.ano, m.mesNum, 0, 23, 59, 59, 999)

          const { count } = await supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true })
            .gte('data_cadastro', primeiroDia.toISOString())
            .lte('data_cadastro', ultimoDia.toISOString())

          return {
            mes: m.mes,
            quantidade: count || 0,
          }
        })
      )

      setChartData(chartData)
      setLoading(false)
    }

    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('clientes_por_mes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
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

  const options = {
    chart: {
      type: 'area' as const,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: chartData.map(item => item.mes),
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px'
        }
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'inherit'
      },
      fillSeriesColor: false,
      marker: {
        show: true,
        fillColors: ['#10b981']
      },
      y: {
        formatter: function(val: number) {
          return val + ' cliente' + (val !== 1 ? 's' : '')
        },
        title: {
          formatter: function(seriesName: string) {
            return seriesName + ': '
          }
        }
      },
      x: {
        formatter: function(val: string) {
          return val
        }
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const value = series[seriesIndex][dataPointIndex]
        const month = w.globals.categoryLabels[dataPointIndex]
        return `
          <div style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="font-size: 12px; font-weight: 600; color: #1f2937; margin-bottom: 6px; text-transform: capitalize;">
              ${month}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: #10b981; border-radius: 2px;"></span>
              <span style="font-size: 14px; font-weight: 700; color: #059669;">
                ${value} cliente${value !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        `
      }
    },
    colors: ['#10b981']
  }

  const series = [
    {
      name: 'Clientes',
      data: chartData.map(item => item.quantidade)
    }
  ]

  if (loading) {
    return (
      <Card title="Quantidade de Clientes por Mês">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Carregando gráfico...</div>
        </div>
      </Card>
    )
  }

  const ChartComponent = Chart as any

  return (
    <Card title="Quantidade de Clientes por Mês">
      <ChartComponent
        options={options}
        series={series}
        type="area"
        height={300}
      />
    </Card>
  )
}

