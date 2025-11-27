import { AutomationFlow } from '@/types/automation.types'

// Mock API functions
export async function getAutomationFlow(id: string): Promise<AutomationFlow | null> {
  // Simular chamada API
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Retornar dados mock ou buscar do Supabase
  return {
    id,
    name: 'Fluxo de Automação',
    nodes: [
      {
        id: 'gatilhoManual-1',
        type: 'gatilhoManual',
        position: { x: 250, y: 100 },
        data: { label: 'Gatilho Manual' }
      }
    ],
    edges: [],
    updatedAt: new Date().toISOString()
  }
}

export async function saveAutomationFlow(id: string, flow: Omit<AutomationFlow, 'id' | 'updatedAt'>): Promise<void> {
  // Simular chamada API
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Aqui você salvaria no Supabase
  // const supabase = createClient()
  // await supabase
  //   .from('fluxos_automacao')
  //   .update({ configuracao: { nodes: flow.nodes, edges: flow.edges } })
  //   .eq('id', id)
}

