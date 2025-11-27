'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'

interface ClienteStatusEditorProps {
  clienteId: string
  currentStatus: 'a_iniciar' | 'em_andamento' | 'finalizado'
}

const getStatusBadge = (status: string) => {
  const styles = {
    a_iniciar: 'bg-yellow-100 text-yellow-800',
    em_andamento: 'bg-blue-100 text-blue-800',
    finalizado: 'bg-green-100 text-green-800',
  }
  return styles[status as keyof typeof styles] || styles.a_iniciar
}

export function ClienteStatusEditor({ clienteId, currentStatus }: ClienteStatusEditorProps) {
  const router = useRouter()
  const { alert } = useModal()
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sincronizar com mudanças externas
  useEffect(() => {
    setStatus(currentStatus)
  }, [currentStatus])

  const handleStatusChange = async (newStatus: 'a_iniciar' | 'em_andamento' | 'finalizado') => {
    if (newStatus === status) return

    const previousStatus = status
    setStatus(newStatus) // Atualizar UI imediatamente
    setIsUpdating(true)
    
    const supabase = createClient()
    const { error } = await supabase
      .from('clientes')
      .update({ status: newStatus })
      .eq('id', clienteId)

    if (!error) {
      router.refresh()
    } else {
      await alert('Erro ao atualizar status: ' + error.message, 'Erro')
      // Reverter para o status anterior em caso de erro
      setStatus(previousStatus)
    }
    
    setIsUpdating(false)
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-600">Status</label>
      <div className="mt-1">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as 'a_iniciar' | 'em_andamento' | 'finalizado')}
          disabled={isUpdating}
          className={`text-sm font-medium rounded-full px-4 py-2 border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none ${getStatusBadge(status)} ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'} transition-opacity`}
          style={{
            backgroundImage: !isUpdating ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: !isUpdating ? '2.5rem' : '1rem',
          }}
        >
          <option value="a_iniciar">A iniciar</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>
    </div>
  )
}

