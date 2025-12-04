import { createClient } from '@/lib/supabase/client'

/**
 * Obtém o ID da primeira coluna do kanban (coluna "A iniciar" ou primeira coluna disponível)
 * Esta função busca a coluna com menor ordem que está ativa
 */
export async function getPrimeiraColunaKanbanId(): Promise<string | null> {
  const supabase = createClient()
  
  // Primeiro, tentar encontrar uma coluna chamada "A iniciar"
  const { data: colunaAIniciar } = await supabase
    .from('kanban_colunas')
    .select('id')
    .eq('nome', 'A iniciar')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .limit(1)
    .single()

  if (colunaAIniciar?.id) {
    return colunaAIniciar.id
  }

  // Se não encontrar "A iniciar", buscar a primeira coluna por ordem
  const { data: primeiraColuna } = await supabase
    .from('kanban_colunas')
    .select('id')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .limit(1)
    .single()

  return primeiraColuna?.id || null
}



















