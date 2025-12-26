'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { 
  Save,
  Building2,
  Globe,
  CheckCircle2,
  User,
  Mail,
  Lock
} from 'lucide-react'

interface Configuracao {
  id: string
  chave: string
  valor: string
  tipo: 'string' | 'number' | 'boolean' | 'json'
  categoria: 'geral' | 'notificacoes' | 'integracao' | 'visualizacao' | 'backup'
  descricao: string | null
}

type ConfiguracoesMap = Record<string, string>

export default function ConfiguracoesPage() {
  // Verificar assinatura ativa (bloqueia acesso se não tiver)
  const { loading: loadingAssinatura } = useAssinaturaAtiva()
  const { user } = useAuth()
  
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const [formValues, setFormValues] = useState<ConfiguracoesMap>({})
  const [perfilValues, setPerfilValues] = useState({
    nomeCompleto: '',
    email: '',
    senha: ''
  })
  const [savingPerfil, setSavingPerfil] = useState(false)

  useEffect(() => {
    loadConfiguracoes()
    if (user) {
      setPerfilValues({
        nomeCompleto: user.user_metadata?.nome_completo || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        email: user.email || '',
        senha: ''
      })
    }
  }, [user])

  async function loadConfiguracoes() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .select('*')
      .order('categoria', { ascending: true })

    if (!error && data) {
      setConfiguracoes(data)
      const values: ConfiguracoesMap = {}
      data.forEach((config) => {
        values[config.chave] = config.valor || ''
      })
      setFormValues(values)
    }
    setLoading(false)
  }

  function updateValue(chave: string, valor: string) {
    setFormValues((prev) => ({
      ...prev,
      [chave]: valor
    }))
  }

  async function saveConfiguracoes() {
    setSaving(true)
    setSaveSuccess(false)
    
    const supabase = createClient()
    const updates = Object.entries(formValues).map(([chave, valor]) => ({
      chave,
      valor: valor.toString()
    }))

    try {
      for (const update of updates) {
        const config = configuracoes.find((c) => c.chave === update.chave)
        if (config) {
          const { error } = await supabase
            .from('configuracoes_sistema')
            .update({ valor: update.valor })
            .eq('chave', update.chave)

          if (error) {
            console.error('Erro ao salvar configuração:', error)
          }
        }
      }

      // Salvar preferências de visualização no localStorage também
      if (formValues.visualizacao_itens_por_pagina) {
        localStorage.setItem('itensPorPagina', formValues.visualizacao_itens_por_pagina)
      }
      if (formValues.visualizacao_tema) {
        localStorage.setItem('tema', formValues.visualizacao_tema)
      }

      await loadConfiguracoes()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
    } finally {
      setSaving(false)
    }
  }

  function getValue(chave: string): string {
    return formValues[chave] || ''
  }

  function getInicial(nome: string): string {
    if (!nome) return 'U'
    return nome.charAt(0).toUpperCase()
  }

  function getAvatarColor(nome: string): string {
    const cores = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-teal-100 text-teal-800',
    ]
    if (!nome) return cores[0]
    const hash = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return cores[hash % cores.length]
  }

  async function savePerfil() {
    setSavingPerfil(true)
    const supabase = createClient()
    
    try {
      // Atualizar nome completo (se mudou)
      if (perfilValues.nomeCompleto && perfilValues.nomeCompleto !== (user?.user_metadata?.nome_completo || user?.user_metadata?.full_name || '')) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { nome_completo: perfilValues.nomeCompleto }
        })
        
        if (updateError) {
          console.error('Erro ao atualizar nome:', updateError)
        }
      }

      // Atualizar email (se mudou)
      if (perfilValues.email && perfilValues.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: perfilValues.email
        })
        
        if (emailError) {
          console.error('Erro ao atualizar email:', emailError)
        }
      }

      // Atualizar senha (se preenchida)
      if (perfilValues.senha && perfilValues.senha.length > 0) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: perfilValues.senha
        })
        
        if (passwordError) {
          console.error('Erro ao atualizar senha:', passwordError)
        } else {
          // Limpar campo de senha após sucesso
          setPerfilValues(prev => ({ ...prev, senha: '' }))
        }
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
    } finally {
      setSavingPerfil(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie as configurações do sistema</p>
        </div>
        <Loading isLoading={true} message="Carregando configurações..." />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie as configurações do sistema</p>
        </div>
        <button
          onClick={saveConfiguracoes}
          disabled={saving}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-green-800">Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* Seção de Perfil */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
          {/* Coluna Esquerda - Título e Descrição */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfil</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Suas informações pessoais e configurações de segurança da conta.
            </p>
          </div>

          {/* Coluna Direita - Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Avatar e Nome */}
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${getAvatarColor(perfilValues.nomeCompleto || user?.email || '')} flex items-center justify-center text-2xl font-bold`}>
                  {perfilValues.nomeCompleto ? getInicial(perfilValues.nomeCompleto) : (user?.email ? getInicial(user.email) : 'U')}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {perfilValues.nomeCompleto || user?.email?.split('@')[0] || 'Usuário'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Campos do Formulário */}
            <div className="space-y-4">
              {/* Nome Completo */}
              <Input
                label="Nome completo"
                icon={<User className="w-5 h-5" />}
                value={perfilValues.nomeCompleto}
                onChange={(e) => setPerfilValues(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                placeholder="Digite seu nome completo"
              />

              {/* E-mail */}
              <Input
                label="E-mail"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                value={perfilValues.email}
                onChange={(e) => setPerfilValues(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Digite seu e-mail"
              />

              {/* Senha */}
              <Input
                label="Senha"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                value={perfilValues.senha}
                onChange={(e) => setPerfilValues(prev => ({ ...prev, senha: e.target.value }))}
                placeholder="Insira a nova senha"
              />

              {/* Botão Salvar Perfil */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={savePerfil}
                  disabled={savingPerfil}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPerfil ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Perfil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo da Aba Geral */}
      <div className="space-y-6">
        <Card title="Configurações Gerais" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Nome da Empresa"
                icon={<Building2 className="w-5 h-5" />}
                value={getValue('nome_empresa')}
                onChange={(e) => updateValue('nome_empresa', e.target.value)}
                placeholder="Digite o nome da empresa"
              />
            </div>

            <div>
              <Select
                label="Moeda"
                value={getValue('moeda')}
                onChange={(e) => updateValue('moeda', e.target.value)}
                options={[
                  { value: 'BRL', label: 'Real Brasileiro (BRL)' },
                  { value: 'USD', label: 'Dólar Americano (USD)' },
                  { value: 'EUR', label: 'Euro (EUR)' },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Fuso Horário"
                value={getValue('fuso_horario')}
                onChange={(e) => updateValue('fuso_horario', e.target.value)}
                options={[
                  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
                  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
                  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
                  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
                ]}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}





