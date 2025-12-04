import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// Singleton para reutilizar o cliente Supabase
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Reutilizar cliente existente se já foi criado
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}

