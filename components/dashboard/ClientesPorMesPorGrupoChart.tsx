'use client'

import { Card } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import dynamic from 'next/dynamic'
import { Database } from '@/types/database.types'

// @ts-ignore - react-apexcharts não tem tipos corretos para dynamic import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type Grupo = Database['public']['Tables']['grupos']['Row']
type ClienteGrupo = Database['public']['Tables']['clientes_grupos']['Row'] & {
  grupos?: Grupo
}

export function ClientesPorMesPorGrupoChart() {
  const [chartData, setChartData] = useState<any[]>([])
  const [mesesFiltrados, setMesesFiltrados] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ]

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Buscar todos os grupos ativos
      const { data: gruposData } = await supabase
        .from('grupos')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')

      if (!gruposData) {
        setLoading(false)
        return
      }

      // Buscar últimos 6 meses
      const meses: Array<{ mes: string; mesNum: number; ano: number }> = []
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i)
        meses.push({
          mes: format(date, 'MMM', { locale: ptBR }),
          mesNum: date.getMonth() + 1,
          ano: date.getFullYear(),
        })
      }

      // Buscar clientes_grupos com dados dos grupos
      const { data: clientesGrupos } = await supabase
        .from('clientes_grupos')
        .select(`
          *,
          grupos (*)
        `)

      // Preparar dados por grupo e mês
      const dadosPorGrupo: Record<string, Record<string, number>> = {}
      
      gruposData.forEach(grupo => {
        dadosPorGrupo[grupo.id] = {}
        meses.forEach(m => {
          dadosPorGrupo[grupo.id][`${m.ano}-${m.mesNum}`] = 0
        })
      })

      if (clientesGrupos) {
        clientesGrupos.forEach((cg: ClienteGrupo) => {
          if (!cg.grupos || !cg.data_entrada) return
          
          const dataEntrada = new Date(cg.data_entrada)
          const grupoId = cg.grupo_id
          
          // Encontrar em qual mês o cliente entrou
          meses.forEach(m => {
            const primeiroDiaMes = new Date(m.ano, m.mesNum - 1, 1)
            const ultimoDiaMes = new Date(m.ano, m.mesNum, 0, 23, 59, 59, 999)
            const mesAnoAtual = `${m.ano}-${m.mesNum}`
            
            if (dataEntrada >= primeiroDiaMes && dataEntrada <= ultimoDiaMes) {
              if (dadosPorGrupo[grupoId] && dadosPorGrupo[grupoId][mesAnoAtual] !== undefined) {
                dadosPorGrupo[grupoId][mesAnoAtual]++
              }
            }
          })
        })
      }

      // Identificar meses que têm pelo menos um cliente em algum grupo
      const mesesComDados: Array<{ mes: string; mesNum: number; ano: number }> = []
      meses.forEach(m => {
        const mesAno = `${m.ano}-${m.mesNum}`
        const temDados = gruposData.some(grupo => {
          const valor = dadosPorGrupo[grupo.id]?.[mesAno] || 0
          return valor > 0
        })
        if (temDados) {
          mesesComDados.push(m)
        }
      })

      // Formatar dados para o gráfico
      const series = gruposData
        .map((grupo, index) => ({
          name: grupo.nome,
          data: mesesComDados.map(m => {
            const mesAno = `${m.ano}-${m.mesNum}`
            const valor = dadosPorGrupo[grupo.id]?.[mesAno] || 0
            return valor > 0 ? valor : null
          })
        }))
        .filter(serie => serie.data.some(val => val !== null && val > 0))

      setMesesFiltrados(mesesComDados.map(m => m.mes))
      setChartData(series)
      setLoading(false)
    }

    loadData()

    // Configurar subscriptions Realtime
    const supabase = createClient()
    const channel1 = supabase
      .channel('clientes_por_mes_grupo_clientes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes_grupos',
        },
        async () => {
          await loadData()
        }
      )
      .subscribe()

    const channel2 = supabase
      .channel('clientes_por_mes_grupo_grupos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grupos',
        },
        async () => {
          await loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [])

  // Aplicar cores de fundo aos dataLabels após renderização
  useEffect(() => {
    if (!chartData.length || !mesesFiltrados.length) return

    const applyLabelStyles = () => {
      const dataLabelElements = document.querySelectorAll('.apexcharts-datalabel')
      
      if (dataLabelElements.length === 0) return
      
      dataLabelElements.forEach((el, index) => {
        const seriesIndex = Math.floor(index / mesesFiltrados.length)
        
        if (seriesIndex < chartData.length && seriesIndex < colors.length) {
          const htmlEl = el as HTMLElement
          const rect = htmlEl.querySelector('rect')
          
          // Apenas aplicar cor de fundo ao retângulo
          if (rect) {
            rect.setAttribute('fill', colors[seriesIndex])
            rect.setAttribute('opacity', '1')
            rect.setAttribute('rx', '4')
            rect.setAttribute('ry', '4')
          }
        }
      })
    }

    const chartContainer = document.querySelector('.apexcharts-canvas')
    if (chartContainer) {
      const observer = new MutationObserver(() => {
        applyLabelStyles()
      })
      
      observer.observe(chartContainer, {
        childList: true,
        subtree: true
      })
      
      applyLabelStyles()
      const timers = [
        setTimeout(applyLabelStyles, 100),
        setTimeout(applyLabelStyles, 500),
        setTimeout(applyLabelStyles, 1000)
      ]
      
      return () => {
        observer.disconnect()
        timers.forEach(timer => clearTimeout(timer))
      }
    } else {
      const timers = [
        setTimeout(applyLabelStyles, 100),
        setTimeout(applyLabelStyles, 500),
        setTimeout(applyLabelStyles, 1000)
      ]
      
      return () => {
        timers.forEach(timer => clearTimeout(timer))
      }
    }
  }, [chartData, mesesFiltrados])

  const options = {
    chart: {
      type: 'line' as const,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: number | null, opts: any) {
        if (val !== null && val !== undefined && val > 0) {
          const seriesIndex = opts.seriesIndex
          const seriesName = opts.w?.globals?.seriesNames?.[seriesIndex] || ''
          return seriesName
        }
        return ''
      },
      offsetY: -15
    },
    stroke: {
      curve: 'straight' as const,
      width: 3,
      dashArray: chartData.map((_, index) => index % 2 === 0 ? 0 : 5)
    },
    markers: {
      size: 6,
      hover: {
        size: 8
      }
    },
    xaxis: {
      categories: mesesFiltrados,
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      },
      axisBorder: {
        show: true,
        color: '#e5e7eb'
      },
      axisTicks: {
        show: true,
        color: '#e5e7eb'
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
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      }
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const month = w.globals.categoryLabels[dataPointIndex]
        let tooltipContent = `
          <div style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="font-size: 12px; font-weight: 600; color: #1f2937; margin-bottom: 8px; text-transform: capitalize;">
              ${month}
            </div>
        `
        
        // Adicionar dados de cada grupo que tem valor neste mês
        series.forEach((serie: number[], idx: number) => {
          const value = serie[dataPointIndex]
          if (value !== null && value !== undefined && value > 0) {
            const groupName = chartData[idx]?.name || w.globals.seriesNames[idx] || ''
            const groupColor = colors[idx] || '#6b7280'
            tooltipContent += `
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${groupColor}; border-radius: 2px;"></span>
                <span style="font-size: 14px; font-weight: 600; color: #1f2937;">
                  ${groupName}:
                </span>
                <span style="font-size: 14px; font-weight: 700; color: #059669;">
                  ${value} cliente${value !== 1 ? 's' : ''}
                </span>
              </div>
            `
          }
        })
        
        tooltipContent += '</div>'
        return tooltipContent
      }
    },
    legend: {
      show: true,
      position: 'top' as const,
      horizontalAlign: 'left' as const,
      fontSize: '12px',
      labels: {
        colors: '#000',
        useSeriesColors: false,
        formatter: function(seriesName: string, opts: any) {
          const color = colors[opts.seriesIndex] || '#6b7280'
          return '<span style="background-color: ' + color + '; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: 600; display: inline-block;">' + seriesName + '</span>'
        }
      },
      markers: {
        width: 0,
        height: 0,
        radius: 0
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    colors: colors.slice(0, chartData.length)
  }

  if (loading) {
    return (
      <Card title="Clientes por Mês por Grupo">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Carregando gráfico...</div>
        </div>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card title="Clientes por Mês por Grupo">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Nenhum dado disponível</div>
        </div>
      </Card>
    )
  }

  const ChartComponent = Chart as any

  return (
    <Card title="Clientes por Mês por Grupo">
      <ChartComponent
        options={options}
        series={chartData}
        type="line"
        height={455}
      />
    </Card>
  )
}

