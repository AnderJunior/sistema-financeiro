'use client'

import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ServicosCliente } from '@/components/ServicosCliente'
import { CobrancasCliente } from '@/components/CobrancasCliente'
import { GruposCliente } from '@/components/GruposCliente'
import { ClienteDetailWrapper } from '@/components/ClienteDetailWrapper'
import { ClienteStatusEditor } from '@/components/ClienteStatusEditor'
import { ScrollToHash } from '@/components/ScrollToHash'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type Cliente = Database['public']['Tables']['clientes']['Row']

export default function ClienteDetailPage({ params }: { params: { id: string } }) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const clienteId = params.id

  useEffect(() => {
    async function loadCliente() {
      try {
        // Verificar autenticação primeiro
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          setError('Você precisa estar autenticado para visualizar este cliente.')
          setLoading(false)
          return
        }
        
        // Buscar o cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', clienteId)
          .single()

        if (clienteError) {
          setError(clienteError.message || 'Cliente não encontrado')
          setLoading(false)
          return
        }

        if (!clienteData) {
          setError('Cliente não encontrado')
          setLoading(false)
          return
        }

        // Verificar se o user_id do cliente corresponde ao usuário autenticado
        // (Isso não deveria ser necessário com RLS, mas é uma verificação de segurança extra)
        if (clienteData.user_id && clienteData.user_id !== user.id) {
          setError('Você não tem permissão para visualizar este cliente.')
          setLoading(false)
          return
        }

        setCliente(clienteData)
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar cliente')
        setLoading(false)
      }
    }

    loadCliente()
  }, [clienteId, supabase, router])

  if (loading) {
    return (
      <div className="p-8">
        <Loading />
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Cliente não encontrado'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error === 'Você precisa estar autenticado para visualizar este cliente.' 
              ? 'Faça login para continuar.'
              : 'O cliente solicitado não foi encontrado ou você não tem permissão para visualizá-lo.'}
          </p>
          {error === 'Você precisa estar autenticado para visualizar este cliente.' ? (
            <Link href="/login" className="text-primary-600 hover:text-primary-700">
              Fazer login
            </Link>
          ) : (
            <Link href="/clientes" className="text-primary-600 hover:text-primary-700">
              Voltar para lista de clientes
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <ScrollToHash />
      <div className="mb-8">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <ClienteDetailWrapper cliente={cliente} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Cadastrais */}
          <Card title="Dados Cadastrais">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome</label>
                <p className="text-gray-900 mt-1">{cliente.nome}</p>
              </div>
              {(cliente as any).nome_empresa && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome Empresa</label>
                  <p className="text-gray-900 mt-1">{(cliente as any).nome_empresa}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo de Pessoa</label>
                <p className="text-gray-900 mt-1">{cliente.tipo_pessoa}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">CPF/CNPJ</label>
                <p className="text-gray-900 mt-1">{cliente.cpf_cnpj || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900 mt-1">{cliente.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Telefone</label>
                <p className="text-gray-900 mt-1">{cliente.telefone || '-'}</p>
              </div>
              <ClienteStatusEditor 
                clienteId={cliente.id} 
                currentStatus={cliente.status as 'a_iniciar' | 'em_andamento' | 'finalizado'} 
              />
              <div>
                <label className="text-sm font-medium text-gray-600">Data de Cadastro</label>
                <p className="text-gray-900 mt-1">{formatDate(cliente.data_cadastro)}</p>
              </div>
              {cliente.observacoes && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600">Observações</label>
                  <p className="text-gray-900 mt-1">{cliente.observacoes}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Projetos do Cliente */}
          <ServicosCliente clienteId={cliente.id} />

          {/* Cobranças Ativas */}
          <CobrancasCliente clienteId={cliente.id} />
        </div>

        <div className="space-y-6">
          {/* Grupos */}
          <GruposCliente clienteId={cliente.id} />
        </div>
      </div>
    </div>
  )
}

