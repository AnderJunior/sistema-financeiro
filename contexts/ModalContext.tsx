'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { AlertModal } from '@/components/modals/AlertModal'
import { ConfirmModal } from '@/components/modals/ConfirmModal'

interface ModalContextType {
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string, confirmText?: string, cancelText?: string, confirmButtonColor?: 'primary' | 'danger') => Promise<boolean>
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    message: string
    title?: string
    resolve?: () => void
  }>({
    isOpen: false,
    message: '',
    title: undefined,
    resolve: undefined,
  })

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    message: string
    title?: string
    confirmText?: string
    cancelText?: string
    confirmButtonColor?: 'primary' | 'danger'
    resolve?: (value: boolean) => void
  }>({
    isOpen: false,
    message: '',
    title: undefined,
    confirmText: undefined,
    cancelText: undefined,
    confirmButtonColor: undefined,
    resolve: undefined,
  })

  const alert = (message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        title,
        resolve,
      })
    })
  }

  const confirm = (
    message: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    confirmButtonColor?: 'primary' | 'danger'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        title,
        confirmText,
        cancelText,
        confirmButtonColor,
        resolve,
      })
    })
  }

  const handleAlertClose = () => {
    if (alertState.resolve) {
      alertState.resolve()
    }
    setAlertState({
      isOpen: false,
      message: '',
      title: undefined,
      resolve: undefined,
    })
  }

  const handleConfirmClose = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false)
    }
    setConfirmState({
      isOpen: false,
      message: '',
      title: undefined,
      confirmText: undefined,
      cancelText: undefined,
      confirmButtonColor: undefined,
      resolve: undefined,
    })
  }

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true)
    }
    setConfirmState({
      isOpen: false,
      message: '',
      title: undefined,
      confirmText: undefined,
      cancelText: undefined,
      confirmButtonColor: undefined,
      resolve: undefined,
    })
  }

  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={handleAlertClose}
        message={alertState.message}
        title={alertState.title}
      />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        message={confirmState.message}
        title={confirmState.title}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmButtonColor={confirmState.confirmButtonColor}
      />
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

