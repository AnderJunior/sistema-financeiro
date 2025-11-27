'use client'

import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  confirmButtonColor?: 'primary' | 'danger'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  title = 'Confirmar ação',
  confirmText = 'OK',
  cancelText = 'Cancelar',
  confirmButtonColor = 'primary',
}: ConfirmModalProps) {
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

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

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
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Ícone de aviso */}
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-100 rounded-full blur-xl opacity-50"></div>
              <div className="relative bg-yellow-50 rounded-full p-4">
                <AlertTriangle className="w-12 h-12 text-yellow-600" />
              </div>
            </div>

            {/* Mensagem */}
            <div className="text-gray-700 whitespace-pre-line">
              {message}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 bg-white text-gray-700 px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-6 py-2.5 rounded-lg transition-colors font-medium ${
              confirmButtonColor === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

