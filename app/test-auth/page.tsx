import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TestAuthPage() {
  const supabase = await createClient()
  
  // Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Verificar sessão
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  // Verificar cookies disponíveis (para debug)
  const cookieStore = await import('next/headers').then(m => m.cookies())
  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(c => 
    c.name.includes('supabase') || c.name.includes('sb-') || c.name.includes('auth')
  )
  
  // Tentar buscar um cliente
  const { data: clientes, error: clientesError } = await supabase
    .from('clientes')
    .select('id, nome, user_id')
    .limit(5)
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Autenticação e RLS</h1>
      
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Informações do Usuário</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify({
              user: user ? {
                id: user.id,
                email: user.email
              } : null,
              authError: authError?.message || null,
              session: session ? {
                user_id: session.user.id,
                expires_at: session.expires_at
              } : null,
              sessionError: sessionError?.message || null,
              cookies: {
                total: allCookies.length,
                supabaseCookies: supabaseCookies.length,
                cookieNames: supabaseCookies.map(c => c.name)
              }
            }, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Clientes Encontrados</h2>
          {clientesError ? (
            <div className="text-red-600">
              <p className="font-semibold">Erro ao buscar clientes:</p>
              <pre className="bg-red-50 p-2 rounded text-sm mt-2">
                {JSON.stringify({
                  message: clientesError.message,
                  details: clientesError.details,
                  hint: clientesError.hint,
                  code: clientesError.code
                }, null, 2)}
              </pre>
            </div>
          ) : (
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(clientes, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Diagnóstico:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              Usuário autenticado: {user ? `Sim (${user.id})` : 'Não'}
            </li>
            <li>
              Sessão ativa: {session ? 'Sim' : 'Não'}
            </li>
            <li>
              Clientes encontrados: {clientes?.length || 0}
            </li>
            <li>
              Erro ao buscar clientes: {clientesError ? 'Sim' : 'Não'}
            </li>
            {user && clientes && clientes.length > 0 && (
              <li>
                user_id do cliente corresponde ao usuário: {
                  clientes[0].user_id === user.id ? 'Sim ✅' : 'Não ❌'
                }
              </li>
            )}
          </ul>
        </div>
        
        <div className="mt-4">
          <a 
            href="/clientes" 
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Voltar para lista de clientes
          </a>
        </div>
      </div>
    </div>
  )
}

