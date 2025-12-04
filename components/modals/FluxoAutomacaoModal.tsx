'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'
import { FluxoAutomacao, TipoAutomacao } from '@/app/automacoes/page'
import { 
  Bell, 
  CreditCard, 
  FileText, 
  Link as LinkIcon, 
  HardDrive, 
  Trash2, 
  RefreshCw,
  Zap
} from 'lucide-react'

interface FluxoAutomacaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  fluxo?: FluxoAutomacao | null
}

const tiposAutomacao: Array<{
  value: TipoAutomacao
  label: string
  description: string
  icon: any
  color: string
}> = [
  {
    value: 'notificacao',
    label: 'Notificação',
    description: 'Enviar notificações automáticas por email, SMS ou push',
    icon: Bell,
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
  },
  {
    value: 'cobranca',
    label: 'Cobrança',
    description: 'Automatizar processos de cobrança e pagamentos',
    icon: CreditCard,
    color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
  },
  {
    value: 'relatorio',
    label: 'Relatório',
    description: 'Gerar e enviar relatórios periódicos automaticamente',
    icon: FileText,
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
  },
  {
    value: 'integracao',
    label: 'Integração',
    description: 'Integrar com sistemas externos e APIs',
    icon: LinkIcon,
    color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
  },
  {
    value: 'backup',
    label: 'Backup',
    description: 'Realizar backups automáticos de dados',
    icon: HardDrive,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
  },
  {
    value: 'limpeza',
    label: 'Limpeza',
    description: 'Limpar dados antigos e otimizar o banco de dados',
    icon: Trash2,
    color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
  },
  {
    value: 'sincronizacao',
    label: 'Sincronização',
    description: 'Sincronizar dados entre sistemas e plataformas',
    icon: RefreshCw,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
  },
  {
    value: 'outro',
    label: 'Outro',
    description: 'Criar uma automação personalizada',
    icon: Zap,
    color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
  }
]

export function FluxoAutomacaoModal({ isOpen, onClose, onSuccess, fluxo }: FluxoAutomacaoModalProps) {
  const isEditMode = !!fluxo
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [showTipoSelection, setShowTipoSelection] = useState(!isEditMode)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_automacao: '' as TipoAutomacao | '',
    status: 'rascunho' as 'ativo' | 'inativo' | 'rascunho',
  })

  useEffect(() => {
    if (isOpen) {
      if (fluxo) {
        setFormData({
          nome: fluxo.nome || '',
          descricao: fluxo.descricao || '',
          tipo_automacao: fluxo.tipo_automacao || '',
          status: fluxo.status || 'rascunho',
        })
        setShowTipoSelection(false)
      } else {
        setFormData({
          nome: '',
          descricao: '',
          tipo_automacao: '',
          status: 'rascunho',
        })
        setShowTipoSelection(true)
      }
    }
  }, [fluxo, isOpen])

  const handleSelectTipo = (tipo: TipoAutomacao) => {
    setFormData({ ...formData, tipo_automacao: tipo })
    setShowTipoSelection(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.tipo_automacao) {
      await alert('Por favor, selecione um tipo de automação.', 'Validação')
      return
    }
    
    setLoading(true)

    const supabase = createClient()
    const dataToSave = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      tipo_automacao: formData.tipo_automacao,
      status: formData.status,
      configuracao: {},
    }

    let error
    if (isEditMode && fluxo) {
      const { error: updateError } = await supabase
        .from('fluxos_automacao')
        .update(dataToSave)
        .eq('id', fluxo.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('fluxos_automacao').insert([dataToSave])
      error = insertError
    }

    if (!error) {
      setFormData({
        nome: '',
        descricao: '',
        tipo_automacao: '',
        status: 'rascunho',
      })
      setShowTipoSelection(true)
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} fluxo: ` + error.message, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      if (fluxo) {
        setFormData({
          nome: fluxo.nome || '',
          descricao: fluxo.descricao || '',
          tipo_automacao: fluxo.tipo_automacao || '',
          status: fluxo.status || 'rascunho',
        })
        setShowTipoSelection(false)
      } else {
        setFormData({
          nome: '',
          descricao: '',
          tipo_automacao: '',
          status: 'rascunho',
        })
        setShowTipoSelection(true)
      }
      onClose()
    }
  }

  const selectedTipo = tiposAutomacao.find(t => t.value === formData.tipo_automacao)

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditMode ? "Editar fluxo de automação" : "Criar novo fluxo de automação"}
      size={showTipoSelection ? 'large' : 'medium'}
    >
      {showTipoSelection ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Escolha o tipo de automação
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Selecione o tipo de automação que deseja criar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiposAutomacao.map((tipo) => {
              const Icon = tipo.icon
              return (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => handleSelectTipo(tipo.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${tipo.color}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{tipo.label}</h4>
                      <p className="text-sm opacity-80">{tipo.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {selectedTipo && (
            <div className={`p-4 rounded-lg border-2 ${selectedTipo.color}`}>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = selectedTipo.icon
                  return <Icon className="w-5 h-5" />
                })()}
                <div>
                  <p className="font-semibold">{selectedTipo.label}</p>
                  <p className="text-sm opacity-80">{selectedTipo.description}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Fluxo *
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ex: Notificação de pagamentos em atraso"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (Opcional)
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Descreva o que este fluxo faz..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="rascunho">Rascunho</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.status === 'rascunho' && 'O fluxo está em desenvolvimento e não será executado'}
                {formData.status === 'ativo' && 'O fluxo está ativo e será executado conforme configurado'}
                {formData.status === 'inativo' && 'O fluxo está pausado e não será executado'}
              </p>
            </div>

            {!isEditMode && (
              <button
                type="button"
                onClick={() => setShowTipoSelection(true)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                ← Alterar tipo de automação
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500 pt-2">
            * Campos de preenchimento obrigatório.
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? (isEditMode ? 'Salvando...' : 'Criando...') : (isEditMode ? 'Salvar alterações' : 'Criar fluxo')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

















