'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { createClient } from '@/lib/supabase/client'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'
import { Settings, User, Lock, CreditCard, Calendar, CheckCircle2, XCircle, AlertCircle, Save, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface AssinanteInfo {
  id: string
  nome_usuario: string | null
  email: string
  plano: string | null // UUID do plano
  periodo: string | null
  status: string
  data_ativacao: string | null
  data_vencimento: string | null
  asaas_subscription_id: string | null
  plano_info?: {
    id: string
    nome_plano: string
    valor_plano: number
    periodos_do_plano: any // JSONB - pode conter múltiplos períodos
    status: string
    descricao: string | null
  } | null
}

interface PagamentoHistorico {
  id: string
  data_pagamento: string | null
  forma_pagamento: string | null
  created_at: string | null
  plano: string | null // UUID do plano
  planos?: {
    id: string
    nome_plano: string
    valor_plano: number
  } | null
}

export default function ConfiguracoesPage() {
  const { loading: loadingAssinatura } = useAssinaturaAtiva()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [assinanteInfo, setAssinanteInfo] = useState<AssinanteInfo | null>(null)
  const [pagamentos, setPagamentos] = useState<PagamentoHistorico[]>([])
  
  // Estados para edição de nome
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [erroNome, setErroNome] = useState('')
  const [sucessoNome, setSucessoNome] = useState(false)
  
  // Estados para alteração de senha
  const [alterandoSenha, setAlterandoSenha] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState(false)
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      // Obter usuário logado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError)
        setLoading(false)
        return
      }

      // Buscar informações do assinante
      const { data: assinante, error: assinanteError } = await supabase
        .from('assinantes')
        .select('id, nome_usuario, email, plano, periodo, status, data_ativacao, data_vencimento, asaas_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (assinanteError) {
        console.error('Erro ao buscar assinante:', assinanteError)
      } else if (assinante) {
        // Buscar informações do plano separadamente usando o UUID
        let planoInfo = null
        if (assinante.plano) {
          const { data: plano, error: planoError } = await supabase
            .from('planos')
            .select('id, nome_plano, valor_plano, periodos_do_plano, status, descricao')
            .eq('id', assinante.plano)
            .maybeSingle()
          
          if (!planoError && plano) {
            planoInfo = plano
          } else if (planoError) {
            console.error('Erro ao buscar plano:', planoError)
          }
        }

        const assinanteComPlano: AssinanteInfo = {
          id: assinante.id,
          nome_usuario: assinante.nome_usuario,
          email: assinante.email,
          plano: assinante.plano,
          periodo: assinante.periodo,
          status: assinante.status,
          data_ativacao: assinante.data_ativacao,
          data_vencimento: assinante.data_vencimento,
          asaas_subscription_id: assinante.asaas_subscription_id,
          plano_info: planoInfo,
        }
        
        setAssinanteInfo(assinanteComPlano)
        setNovoNome(assinante.nome_usuario || '')
        
        // Buscar histórico de pagamentos relacionados à assinatura com JOIN no plano
        const { data: pagamentosData, error: pagamentosError } = await supabase
          .from('pagamentos_assinaturas')
          .select(`
            id,
            data_pagamento,
            forma_pagamento,
            created_at,
            plano,
            planos:plano (
              id,
              nome_plano,
              valor_plano
            )
          `)
          .eq('user_id', user.id)
          .order('data_pagamento', { ascending: false })
          .limit(20)

        if (!pagamentosError && pagamentosData) {
          // Processar os dados para extrair informações do plano relacionado
          const pagamentosProcessados = pagamentosData.map((pag: any) => {
            const planoInfo = pag.planos && Array.isArray(pag.planos) 
              ? pag.planos[0] 
              : pag.planos || null
            
            return {
              id: pag.id,
              data_pagamento: pag.data_pagamento,
              forma_pagamento: pag.forma_pagamento,
              created_at: pag.created_at,
              plano: pag.plano,
              planos: planoInfo,
            } as PagamentoHistorico
          })
          
          setPagamentos(pagamentosProcessados)
        } else if (pagamentosError) {
          console.error('Erro ao buscar pagamentos:', pagamentosError)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvarNome = async () => {
    if (!assinanteInfo) return
    
    setSalvandoNome(true)
    setErroNome('')
    setSucessoNome(false)

    if (!novoNome.trim()) {
      setErroNome('O nome não pode estar vazio')
      setSalvandoNome(false)
      return
    }

    try {
      const { error } = await supabase
        .from('assinantes')
        .update({ nome_usuario: novoNome.trim() })
        .eq('id', assinanteInfo.id)

      if (error) {
        setErroNome(error.message || 'Erro ao atualizar nome')
      } else {
        setSucessoNome(true)
        setAssinanteInfo({ ...assinanteInfo, nome_usuario: novoNome.trim() })
        setEditandoNome(false)
        setTimeout(() => setSucessoNome(false), 3000)
      }
    } catch (error: any) {
      setErroNome('Erro ao atualizar nome. Tente novamente.')
    } finally {
      setSalvandoNome(false)
    }
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoSenha(true)
    setErroSenha('')
    setSucessoSenha(false)

    if (novaSenha !== confirmarSenha) {
      setErroSenha('As senhas não coincidem')
      setSalvandoSenha(false)
      return
    }

    if (novaSenha.length < 6) {
      setErroSenha('A senha deve ter pelo menos 6 caracteres')
      setSalvandoSenha(false)
      return
    }

    try {
      // Primeiro, verificar a senha atual fazendo login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setErroSenha('Erro ao obter informações do usuário')
        setSalvandoSenha(false)
        return
      }

      // Tentar fazer login com a senha atual para validar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      })

      if (signInError) {
        setErroSenha('Senha atual incorreta')
        setSalvandoSenha(false)
        return
      }

      // Se chegou aqui, a senha atual está correta, então atualizar
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      })

      if (updateError) {
        setErroSenha(updateError.message || 'Erro ao alterar senha')
      } else {
        setSucessoSenha(true)
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmarSenha('')
        setAlterandoSenha(false)
        setTimeout(() => setSucessoSenha(false), 3000)
      }
    } catch (error: any) {
      setErroSenha('Erro ao alterar senha. Tente novamente.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { label: 'Ativo', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
      teste: { label: 'Teste', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
      suspenso: { label: 'Suspenso', icon: XCircle, color: 'bg-red-100 text-red-800' },
      cancelado: { label: 'Cancelado', icon: XCircle, color: 'bg-gray-100 text-gray-800' },
      pendente_ativacao: { label: 'Pendente', icon: AlertCircle, color: 'bg-blue-100 text-blue-800' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ativo
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  const getStatusPagamentoBadge = (status: string) => {
    const statusConfig = {
      pago: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      previsto: { label: 'Previsto', color: 'bg-blue-100 text-blue-800' },
      em_atraso: { label: 'Em Atraso', color: 'bg-red-100 text-red-800' },
      cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.previsto

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const formatarValor = (valor: number | null) => {
    if (!valor) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const formatarPeriodo = (periodo: string | null) => {
    const periodos: Record<string, string> = {
      mensal: 'Mensal',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual',
    }
    return periodos[periodo || ''] || periodo || '-'
  }

  if (loading || loadingAssinatura) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie suas informações pessoais e preferências</p>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando configurações..." />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Gerencie suas informações pessoais e preferências</p>
      </div>

      <div className="space-y-6">
        {/* Seção: Informações Pessoais */}
        <Card title="Informações Pessoais">
          {assinanteInfo ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de Cadastro
                </label>
                {editandoNome ? (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Digite seu nome"
                      disabled={salvandoNome}
                    />
                    {erroNome && (
                      <p className="text-sm text-red-600">{erroNome}</p>
                    )}
                    {sucessoNome && (
                      <p className="text-sm text-green-600">Nome atualizado com sucesso!</p>
                    )}
                    <div className="flex gap-2 justify-between">
                      <button
                        onClick={() => {
                          setEditandoNome(false)
                          setNovoNome(assinanteInfo.nome_usuario || '')
                          setErroNome('')
                          setSucessoNome(false)
                        }}
                        disabled={salvandoNome}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarNome}
                        disabled={salvandoNome}
                        className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        {salvandoNome ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 font-medium">
                      {assinanteInfo.nome_usuario || 'Não definido'}
                    </p>
                    <button
                      onClick={() => setEditandoNome(true)}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <p className="text-gray-600">{assinanteInfo.email}</p>
                <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Carregando informações...</p>
          )}
        </Card>

        {/* Seção: Segurança - Zona de Perigo */}
        <div className="border-2 border-red-200 rounded-xl bg-red-50/30">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-red-700">
                Ações irreversíveis que afetam sua conta. Use com cuidado.
              </p>
            </div>

            <div className="border-t border-red-200 pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-base font-medium text-gray-900 mb-1">
                    Alterar Senha
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Altere sua senha para manter sua conta segura. Certifique-se de usar uma senha forte.
                  </p>
                  
                  {alterandoSenha && (
                    <form onSubmit={handleAlterarSenha} className="space-y-4 mt-4">
                      <div>
                        <Input
                          type={mostrarSenhaAtual ? 'text' : 'password'}
                          label="Senha Atual"
                          value={senhaAtual}
                          onChange={(e) => setSenhaAtual(e.target.value)}
                          placeholder="Digite sua senha atual"
                          required
                          disabled={salvandoSenha}
                          icon={
                            <button
                              type="button"
                              onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {mostrarSenhaAtual ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          }
                        />
                      </div>

                      <div>
                        <Input
                          type={mostrarNovaSenha ? 'text' : 'password'}
                          label="Nova Senha"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="Digite sua nova senha"
                          required
                          disabled={salvandoSenha}
                          icon={
                            <button
                              type="button"
                              onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {mostrarNovaSenha ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          }
                        />
                      </div>

                      <div>
                        <Input
                          type={mostrarConfirmarSenha ? 'text' : 'password'}
                          label="Confirmar Nova Senha"
                          value={confirmarSenha}
                          onChange={(e) => setConfirmarSenha(e.target.value)}
                          placeholder="Confirme sua nova senha"
                          required
                          disabled={salvandoSenha}
                          icon={
                            <button
                              type="button"
                              onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {mostrarConfirmarSenha ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          }
                        />
                      </div>

                      {erroSenha && (
                        <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                          <p className="text-sm text-red-800 font-medium">{erroSenha}</p>
                        </div>
                      )}

                      {sucessoSenha && (
                        <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                          <p className="text-sm text-green-800 font-medium">Senha alterada com sucesso!</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setAlterandoSenha(false)
                            setSenhaAtual('')
                            setNovaSenha('')
                            setConfirmarSenha('')
                            setErroSenha('')
                            setSucessoSenha(false)
                          }}
                          disabled={salvandoSenha}
                          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={salvandoSenha}
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          <Save className="w-4 h-4" />
                          {salvandoSenha ? 'Alterando...' : 'Alterar Senha'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                
                {!alterandoSenha && (
                  <button
                    onClick={() => setAlterandoSenha(true)}
                    className="ml-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
                  >
                    Alterar Senha
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Seção: Informações do Plano */}
        {assinanteInfo && (
          <Card title="Informações do Plano">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status da Assinatura
                  </label>
                  {getStatusBadge(assinanteInfo.status)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plano
                  </label>
                  <p className="text-gray-900 font-medium">
                    {assinanteInfo.plano_info?.nome_plano || 'Não definido'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <p className="text-gray-900 font-medium">
                    {assinanteInfo.plano_info?.valor_plano 
                      ? formatarValor(assinanteInfo.plano_info.valor_plano)
                      : 'Não definido'
                    }
                    {assinanteInfo.periodo && (
                      <span className="text-gray-600 ml-2">
                        / {formatarPeriodo(assinanteInfo.periodo)}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Ativação
                  </label>
                  <p className="text-gray-900 font-medium">
                    {assinanteInfo.data_ativacao
                      ? format(new Date(assinanteInfo.data_ativacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : '-'}
                  </p>
                </div>

                {assinanteInfo.data_vencimento && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Próximo Vencimento
                    </label>
                    <p className="text-gray-900 font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {format(new Date(assinanteInfo.data_vencimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Seção: Histórico de Pagamentos */}
        <Card title="Histórico de Pagamentos">
          {pagamentos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Valor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Data de Pagamento</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Forma de Pagamento</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Data de Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((pagamento) => (
                    <tr key={pagamento.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {pagamento.planos?.valor_plano 
                          ? formatarValor(pagamento.planos.valor_plano)
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {pagamento.data_pagamento
                          ? format(new Date(pagamento.data_pagamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {pagamento.forma_pagamento || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {pagamento.created_at
                          ? format(new Date(pagamento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum pagamento encontrado</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

