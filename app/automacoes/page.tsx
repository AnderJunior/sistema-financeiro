'use client'

import { Card } from '@/components/ui/Card'
import { Lock } from 'lucide-react'

export default function AutomacoesPage() {
  return (
    <div className="p-8">
      <Card>
        <div className="text-center py-16 px-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <Lock className="w-10 h-10 text-yellow-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Página em Beta
          </h1>
          
          <p className="text-lg text-gray-600 mb-2 max-w-2xl mx-auto">
            A funcionalidade de <strong>Automações</strong> está em desenvolvimento e ainda não está disponível.
          </p>
        </div>
      </Card>
    </div>
  )
}

