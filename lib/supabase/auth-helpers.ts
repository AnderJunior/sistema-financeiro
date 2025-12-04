/**
 * Helpers para autenticação e isolamento de dados por usuário
 * 
 * Estes helpers garantem que todas as operações sejam feitas no contexto
 * do usuário autenticado, mantendo o isolamento de dados no formato SaaS.
 */

import { createClient } from './client'
import { createClient as createServerClient } from './server'

/**
 * Obtém o ID do usuário autenticado no cliente (browser)
 * Retorna null se não houver usuário autenticado
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

/**
 * Obtém o ID do usuário autenticado no servidor
 * Retorna null se não houver usuário autenticado
 */
export async function getCurrentUserIdServer(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

/**
 * Verifica se o usuário está autenticado no cliente
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId()
  return userId !== null
}

/**
 * Verifica se o usuário está autenticado no servidor
 */
export async function isAuthenticatedServer(): Promise<boolean> {
  const userId = await getCurrentUserIdServer()
  return userId !== null
}

/**
 * Garante que o usuário está autenticado, caso contrário lança erro
 * Útil para operações críticas que requerem autenticação
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('Usuário não autenticado')
  }
  return userId
}

/**
 * Garante que o usuário está autenticado no servidor, caso contrário lança erro
 */
export async function requireAuthServer(): Promise<string> {
  const userId = await getCurrentUserIdServer()
  if (!userId) {
    throw new Error('Usuário não autenticado')
  }
  return userId
}










