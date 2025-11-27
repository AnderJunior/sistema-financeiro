'use client'

import { Card } from '@/components/ui/Card'
import { Database } from '@/types/database.types'
import { ChevronLeft, ChevronRight, Building2, Edit2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getBancoByCodigo } from '@/lib/bancos-brasileiros'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type ContaFinanceira = Database['public']['Tables']['contas_financeiras']['Row']

interface ContasCarouselProps {
  contas: ContaFinanceira[]
  onEdit?: (conta: ContaFinanceira) => void
}

interface ContaComSaldo extends ContaFinanceira {
  saldo: number
}

export function ContasCarousel({ contas, onEdit }: ContasCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [contasComSaldo, setContasComSaldo] = useState<ContaComSaldo[]>([])

  // Calcular saldo para cada conta
  useEffect(() => {
    async function calcularSaldos() {
      const supabase = createClient()
      const contasComSaldoCalculado: ContaComSaldo[] = []

      for (const conta of contas) {
        let saldo = 0

        // Buscar lançamentos financeiros da conta (apenas pagos)
        const { data: lancamentos } = await supabase
          .from('financeiro_lancamentos')
          .select('tipo, valor, status')
          .eq('conta_id', conta.id)
          .eq('status', 'pago')

        if (lancamentos) {
          lancamentos.forEach((lancamento) => {
            if (lancamento.tipo === 'entrada') {
              saldo += lancamento.valor
            } else {
              saldo -= lancamento.valor
            }
          })
        }

        // Buscar transferências onde a conta é origem (subtrai)
        const { data: transferenciasSaida } = await supabase
          .from('transferencias_bancarias')
          .select('valor_enviado')
          .eq('banco_origem_id', conta.id)

        if (transferenciasSaida) {
          transferenciasSaida.forEach((t) => {
            saldo -= t.valor_enviado
          })
        }

        // Buscar transferências onde a conta é destino (adiciona)
        const { data: transferenciasEntrada } = await supabase
          .from('transferencias_bancarias')
          .select('valor_enviado')
          .eq('banco_recebedor_id', conta.id)

        if (transferenciasEntrada) {
          transferenciasEntrada.forEach((t) => {
            saldo += t.valor_enviado
          })
        }

        contasComSaldoCalculado.push({
          ...conta,
          saldo,
        })
      }

      setContasComSaldo(contasComSaldoCalculado)
    }

    if (contas.length > 0) {
      calcularSaldos()
    } else {
      setContasComSaldo([])
    }
  }, [contas])

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  // Verificar scrollability quando o componente monta ou quando contas mudam
  useEffect(() => {
    checkScrollability()
    const handleResize = () => checkScrollability()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [contasComSaldo])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400
      const currentScroll = scrollContainerRef.current.scrollLeft
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      })
    }
  }

  if (contas.length === 0) {
    return (
      <Card title="Contas Financeiras">
        <div className="text-center py-8 text-gray-500">
          Nenhuma conta cadastrada
        </div>
      </Card>
    )
  }

  return (
    <Card title="Contas Financeiras">
      <div className="relative">
        {/* Botão esquerdo */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Container do carrossel */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
           {contasComSaldo.map((conta) => {
             const banco = conta.banco_id ? getBancoByCodigo(conta.banco_id) : null
             // Usar cor do banco se disponível, senão usar roxo padrão similar ao card da imagem
             const corCard = conta.cor || banco?.cor || '#8A05BE'
             const IconeBanco = banco?.icon || Building2
             
             return (
               <div
                 key={conta.id}
                 className="flex-shrink-0 w-72 h-44 rounded-2xl p-6 relative flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                 style={{ 
                   backgroundColor: corCard,
                   background: `linear-gradient(135deg, ${corCard} 0%, ${corCard}dd 100%)`
                 }}
               >
                 {/* Elementos decorativos de fundo - linhas onduladas */}
                 <div className="absolute bottom-0 left-0 w-full h-20 opacity-15">
                   <svg width="100%" height="100%" viewBox="0 0 400 80" preserveAspectRatio="none">
                     <path 
                       d="M0,40 Q80,20 160,40 T320,40 Q400,20 400,40 L400,80 L0,80 Z" 
                       fill="white"
                     />
                     <path 
                       d="M0,50 Q100,30 200,50 T400,50 L400,80 L0,80 Z" 
                       fill="white"
                       opacity="0.6"
                     />
                   </svg>
                 </div>
                 {/* Círculo decorativo no canto superior direito */}
                 <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10" style={{ backgroundColor: 'white' }}></div>

                 {/* Conteúdo do card */}
                 <div className="relative z-10 flex flex-col justify-between h-full">
                   {/* Parte de cima: Ícone do Banco + Valor no banco */}
                   <div className="flex items-start justify-between">
                     {/* Ícone do banco - topo esquerdo */}
                     <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                       <IconeBanco className="w-7 h-7 text-white" />
                     </div>

                     {/* Valor no banco - topo direito */}
                     <div className="text-right">
                       <span className="text-3xl font-bold text-white">
                         {formatCurrency(conta.saldo)}
                       </span>
                     </div>
                   </div>

                   {/* Parte de baixo: Nome do banco + Botão de editar */}
                   <div className="flex items-end justify-between">
                     {/* Nome do banco - embaixo esquerdo */}
                     <span className="text-base font-semibold text-white/90">
                       {conta.nome}
                     </span>

                     {/* Botão de editar - embaixo direito */}
                     {onEdit && (
                       <button
                         onClick={() => onEdit(conta)}
                         className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-all duration-200 flex items-center justify-center group"
                         aria-label="Editar conta"
                       >
                         <Edit2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                       </button>
                     )}
                   </div>
                 </div>
               </div>
             )
           })}
        </div>

        {/* Botão direito */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Card>
  )
}
