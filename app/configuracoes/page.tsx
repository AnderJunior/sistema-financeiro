'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { 
  Settings, 
  Bell, 
  Webhook, 
  Download, 
  Palette, 
  Info,
  Save,
  Building2,
  Globe,
  Mail,
  AlertCircle,
  CheckCircle2
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
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'geral' | 'notificacoes' | 'integracao' | 'visualizacao' | 'backup' | 'sistema'>('geral')
  
  const [formValues, setFormValues] = useState<ConfiguracoesMap>({})

  useEffect(() => {
    loadConfiguracoes()
  }, [])

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

  function getBooleanValue(chave: string): boolean {
    return formValues[chave] === 'true'
  }

  const tabs = [
    { id: 'geral' as const, label: 'Geral', icon: Settings },
    { id: 'notificacoes' as const, label: 'Notificações', icon: Bell },
    { id: 'integracao' as const, label: 'Integrações', icon: Webhook },
    { id: 'visualizacao' as const, label: 'Visualização', icon: Palette },
    { id: 'backup' as const, label: 'Backup', icon: Download },
    { id: 'sistema' as const, label: 'Sistema', icon: Info },
  ]

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

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="space-y-6">
        {activeTab === 'geral' && (
          <Card title="Configurações Gerais" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <Input
                    label="Nome da Empresa"
                    value={getValue('nome_empresa')}
                    onChange={(e) => updateValue('nome_empresa', e.target.value)}
                    placeholder="Digite o nome da empresa"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-gray-500" />
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
        )}

        {activeTab === 'notificacoes' && (
          <Card title="Configurações de Notificações" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <Switch
                    label="Habilitar Notificações por Email"
                    description="Receba notificações importantes por email"
                    checked={getBooleanValue('notificacoes_email_habilitado')}
                    onChange={(e) => updateValue('notificacoes_email_habilitado', e.target.checked.toString())}
                  />
                </div>
              </div>

              {getBooleanValue('notificacoes_email_habilitado') && (
                <Input
                  label="Email para Notificações"
                  type="email"
                  value={getValue('notificacoes_email_destinatario')}
                  onChange={(e) => updateValue('notificacoes_email_destinatario', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              )}

              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Tipos de Notificações
                </h4>

                <Switch
                  label="Serviços Atrasados"
                  description="Notificar sobre serviços com vencimento próximo ou atrasado"
                  checked={getBooleanValue('notificacoes_servicos_atrasados')}
                  onChange={(e) => updateValue('notificacoes_servicos_atrasados', e.target.checked.toString())}
                />

                <Switch
                  label="Pagamentos Pendentes"
                  description="Notificar sobre pagamentos pendentes ou em atraso"
                  checked={getBooleanValue('notificacoes_pagamentos_pendentes')}
                  onChange={(e) => updateValue('notificacoes_pagamentos_pendentes', e.target.checked.toString())}
                />

                <Switch
                  label="Projetos Atrasados"
                  description="Notificar sobre projetos com prazo próximo ou atrasado"
                  checked={getBooleanValue('notificacoes_projetos_atrasados')}
                  onChange={(e) => updateValue('notificacoes_projetos_atrasados', e.target.checked.toString())}
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'integracao' && (
          <Card title="Integrações e Webhooks" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <Switch
                    label="Habilitar Webhooks"
                    description="Permitir que sistemas externos recebam notificações via webhook"
                    checked={getBooleanValue('webhook_habilitado')}
                    onChange={(e) => updateValue('webhook_habilitado', e.target.checked.toString())}
                  />
                </div>
              </div>

              {getBooleanValue('webhook_habilitado') && (
                <Input
                  label="URL do Webhook"
                  type="url"
                  value={getValue('webhook_url')}
                  onChange={(e) => updateValue('webhook_url', e.target.value)}
                  placeholder="https://exemplo.com/webhook"
                />
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Dica:</strong> Configure webhooks para integrar com sistemas externos como n8n, Zapier ou outros serviços de automação.
                </p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'visualizacao' && (
          <Card title="Preferências de Visualização" className="space-y-6">
            <div className="space-y-6">
              <Select
                label="Itens por Página"
                value={getValue('visualizacao_itens_por_pagina')}
                onChange={(e) => updateValue('visualizacao_itens_por_pagina', e.target.value)}
                options={[
                  { value: '5', label: '5 itens' },
                  { value: '10', label: '10 itens' },
                  { value: '20', label: '20 itens' },
                  { value: '50', label: '50 itens' },
                  { value: '100', label: '100 itens' },
                ]}
              />

              <Select
                label="Tema da Interface"
                value={getValue('visualizacao_tema')}
                onChange={(e) => updateValue('visualizacao_tema', e.target.value)}
                options={[
                  { value: 'claro', label: 'Claro' },
                  { value: 'escuro', label: 'Escuro' },
                  { value: 'auto', label: 'Automático (seguir sistema)' },
                ]}
              />
            </div>
          </Card>
        )}

        {activeTab === 'backup' && (
          <Card title="Backup e Exportação" className="space-y-6">
            <div className="space-y-6">
              <Switch
                label="Backup Automático"
                description="Realizar backup automático dos dados do sistema"
                checked={getBooleanValue('backup_automatico')}
                onChange={(e) => updateValue('backup_automatico', e.target.checked.toString())}
              />

              {getBooleanValue('backup_automatico') && (
                <Select
                  label="Frequência do Backup"
                  value={getValue('backup_frequencia')}
                  onChange={(e) => updateValue('backup_frequencia', e.target.value)}
                  options={[
                    { value: 'diario', label: 'Diário' },
                    { value: 'semanal', label: 'Semanal' },
                    { value: 'mensal', label: 'Mensal' },
                  ]}
                />
              )}

              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Exportação Manual</h4>
                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      const supabase = createClient()
                      // Exportar dados principais
                      const [clientes, projetos, lancamentos] = await Promise.all([
                        supabase.from('clientes').select('*'),
                        supabase.from('projetos').select('*'),
                        supabase.from('financeiro_lancamentos').select('*'),
                      ])

                      const data = {
                        clientes: clientes.data || [],
                        projetos: projetos.data || [],
                        lancamentos: lancamentos.data || [],
                        exportado_em: new Date().toISOString()
                      }

                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Dados (JSON)
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'sistema' && (
          <Card title="Informações do Sistema" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Versão do Sistema
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    1.0.0
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ambiente
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                    {process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Supabase
                </label>
                <p className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg break-all">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurado'}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-4">Estatísticas do Banco de Dados</h4>
                <SistemaStats />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function SistemaStats() {
  const [stats, setStats] = useState<{
    clientes: number
    projetos: number
    lancamentos: number
    servicos: number
  } | null>(null)

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      const [clientes, projetos, lancamentos, servicos] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('projetos').select('*', { count: 'exact', head: true }),
        supabase.from('financeiro_lancamentos').select('*', { count: 'exact', head: true }),
        supabase.from('servicos').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        clientes: clientes.count || 0,
        projetos: projetos.count || 0,
        lancamentos: lancamentos.count || 0,
        servicos: servicos.count || 0,
      })
    }
    loadStats()
  }, [])

  if (!stats) {
    return <Loading isLoading={true} message="Carregando estatísticas..." />
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">{stats.clientes}</p>
        <p className="text-sm text-gray-600">Clientes</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">{stats.projetos}</p>
        <p className="text-sm text-gray-600">Projetos</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">{stats.lancamentos}</p>
        <p className="text-sm text-gray-600">Lançamentos</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-2xl font-bold text-gray-900">{stats.servicos}</p>
        <p className="text-sm text-gray-600">Serviços</p>
      </div>
    </div>
  )
}




