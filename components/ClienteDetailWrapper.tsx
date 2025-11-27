'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClienteModal } from './modals/ClienteModal'
import { Edit } from 'lucide-react'
import { Database } from '@/types/database.types'

type Cliente = Database['public']['Tables']['clientes']['Row']

interface ClienteDetailWrapperProps {
  cliente: Cliente
}

export function ClienteDetailWrapper({ cliente }: ClienteDetailWrapperProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const router = useRouter()

  const handleEditSuccess = () => {
    router.refresh() // Recarregar a página para mostrar os dados atualizados
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{cliente.nome}</h1>
          <p className="text-gray-600 mt-2">Detalhes do cliente</p>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Edit className="w-5 h-5" />
          Editar
        </button>
      </div>

      <ClienteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        cliente={cliente}
      />
    </>
  )
}

