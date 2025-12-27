'use client'

import { useEffect } from 'react'
import { X, MessageCircle, HelpCircle, BookOpen } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const whatsappNumber = '5527992225419'
  const whatsappMessage = encodeURIComponent('Olá! Preciso de ajuda com o sistema Freelancei.')
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Ajuda</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative flex flex-col md:flex-row gap-8">
            {/* Seção Esquerda - Suporte ao Vivo */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Suporte ao Vivo
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Atendimento 24 horas por dia, 7 dias por semana
                </p>
              </div>

              {/* WhatsApp Atendimento */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <MessageCircle className="w-5 h-5 text-gray-600 group-hover:text-green-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                    WhatsApp Atendimento: +55 27 99222-5419
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Somente mensagens)
                  </p>
                </div>
              </a>
            </div>

            {/* Divisor vertical */}
            <div className="hidden md:block w-px bg-gray-200 self-stretch" />

            {/* Seção Direita - Outros Canais */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Outros canais
                </h3>
              </div>

              {/* Central de Ajuda */}
              <div className="flex items-start gap-3 p-3 rounded-lg opacity-60 cursor-not-allowed">
                <div className="flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500">
                    Central de ajuda
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Confira nossos artigos e tire suas dúvidas
                  </p>
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    (Em desenvolvimento)
                  </p>
                </div>
              </div>

              {/* Blog Freelancei */}
              <div className="flex items-start gap-3 p-3 rounded-lg opacity-60 cursor-not-allowed">
                <div className="flex-shrink-0 mt-0.5">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500">
                    Blog Freelancei
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Materiais sobre gestão financeira, tecnologia e negócios
                  </p>
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    (Em desenvolvimento)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

