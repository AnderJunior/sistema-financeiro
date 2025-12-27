'use client'

import { useState, useEffect } from 'react'
import { AdminGuard } from '@/components/AdminGuard'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { AlertModal } from '@/components/modals/AlertModal'
import { Shield, UserPlus, UserMinus, Users, Search, Loader2 } from 'lucide-react'

interface AdminUser {
  id: string
  user_id: string
  created_at: string
  created_by: string | null
  user_email?: string
}

export default function AdminPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })
  const supabase = createClient()

  useEffect(() => {
    loadAdminUsers()
  }, [])

  const loadAdminUsers = async () => {
    try {
      setLoading(true)
      
      // Obter token de acesso do Supabase
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Adicionar token de acesso se disponível
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers,
        credentials: 'include', // Importante: incluir cookies de autenticação
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setAdminUsers(data.adminUsers || [])
    } catch (error: any) {
      console.error('Erro ao carregar usuários admin:', error)
      setAlert({
        show: true,
        message: error.message || 'Erro ao carregar usuários administradores',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      setAlert({
        show: true,
        message: 'Por favor, informe o email do usuário',
        type: 'error'
      })
      return
    }

    try {
      setAddingAdmin(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante: incluir cookies de autenticação
        body: JSON.stringify({ email: newAdminEmail.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao adicionar administrador')
      }

      setAlert({
        show: true,
        message: 'Administrador adicionado com sucesso!',
        type: 'success'
      })
      setNewAdminEmail('')
      loadAdminUsers()
    } catch (error: any) {
      console.error('Erro ao adicionar admin:', error)
      setAlert({
        show: true,
        message: error.message || 'Erro ao adicionar administrador',
        type: 'error'
      })
    } finally {
      setAddingAdmin(false)
    }
  }

  const removeAdmin = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este administrador?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Importante: incluir cookies de autenticação
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover administrador')
      }

      setAlert({
        show: true,
        message: 'Administrador removido com sucesso!',
        type: 'success'
      })
      loadAdminUsers()
    } catch (error: any) {
      console.error('Erro ao remover admin:', error)
      setAlert({
        show: true,
        message: error.message || 'Erro ao remover administrador',
        type: 'error'
      })
    }
  }

  const filteredAdminUsers = adminUsers.filter(admin =>
    admin.user_email?.toLowerCase().includes(searchEmail.toLowerCase())
  )

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Painel de Administração</h1>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Adicionar Novo Administrador
          </h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                label="Email do usuário"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                disabled={addingAdmin}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addAdmin}
                disabled={addingAdmin || !newAdminEmail.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Administradores Cadastrados
            </h2>
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Buscar por email..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredAdminUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchEmail ? 'Nenhum administrador encontrado com esse email' : 'Nenhum administrador cadastrado'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAdminUsers.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{admin.user_email || 'Email não disponível'}</p>
                    <p className="text-sm text-gray-500">
                      Adicionado em: {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAdmin(admin.user_id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <UserMinus className="w-4 h-4" />
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {alert.show && (
          <AlertModal
            isOpen={alert.show}
            onClose={() => setAlert({ ...alert, show: false })}
            title={alert.type === 'success' ? 'Sucesso' : 'Erro'}
            message={alert.message}
            type={alert.type}
          />
        )}
      </div>
    </AdminGuard>
  )
}

