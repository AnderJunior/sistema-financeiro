/**
 * Funções para gerenciar assinaturas no Asaas
 */

import { asaasClient } from './client'

export interface AsaasSubscription {
  object?: string
  id?: string
  dateCreated?: string
  customer?: string
  billingType?: string
  value?: number
  nextDueDate?: string
  cycle?: string
  description?: string
  status?: string
  [key: string]: any
}

export interface AsaasPayment {
  object?: string
  id?: string
  dateCreated?: string
  customer?: string
  billingType?: string
  value?: number
  dueDate?: string
  description?: string
  status?: string
  invoiceUrl?: string
  subscription?: string
  [key: string]: any
}

export interface CreateAsaasSubscriptionData {
  customer: string
  billingType?: string
  value: number
  nextDueDate: string
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  description?: string
}

/**
 * Converte unidade de cobrança do sistema para o formato do Asaas
 */
function convertCycle(unidadeCobranca: string): 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' {
  const mapping: Record<string, 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'> = {
    'mensal': 'MONTHLY',
    'semestral': 'SEMIANNUALLY',
    'anual': 'YEARLY',
  }
  
  return mapping[unidadeCobranca.toLowerCase()] || 'MONTHLY'
}

/**
 * Cria uma assinatura no Asaas
 */
export async function createAsaasSubscription(
  data: CreateAsaasSubscriptionData
): Promise<AsaasSubscription> {
  const subscriptionData: any = {
    customer: data.customer,
    billingType: 'UNDEFINED',
    value: data.value,
    nextDueDate: data.nextDueDate,
    cycle: data.cycle,
  }

  // Adiciona description apenas se fornecido
  if (data.description) {
    subscriptionData.description = data.description
  }

  return await asaasClient.post<AsaasSubscription>('/subscriptions', subscriptionData)
}

/**
 * Cria uma assinatura no Asaas a partir dos dados do sistema
 */
export async function createAsaasSubscriptionFromService(
  asaasCustomerId: string,
  servicoData: {
    nome: string
    valor: number
    unidade_cobranca: string
    data_proxima_assinatura: string
  }
): Promise<AsaasSubscription> {
  return await createAsaasSubscription({
    customer: asaasCustomerId,
    value: servicoData.valor,
    nextDueDate: servicoData.data_proxima_assinatura,
    cycle: convertCycle(servicoData.unidade_cobranca),
    description: servicoData.nome,
  })
}

export interface UpdateAsaasSubscriptionData {
  nextDueDate?: string
  description?: string
  cycle?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
}

/**
 * Atualiza uma assinatura no Asaas
 */
export async function updateAsaasSubscription(
  subscriptionId: string,
  data: UpdateAsaasSubscriptionData
): Promise<AsaasSubscription> {
  const cleanData: any = {}
  
  if (data.nextDueDate) {
    cleanData.nextDueDate = data.nextDueDate
  }
  
  if (data.description !== undefined) {
    cleanData.description = data.description
  }
  
  if (data.cycle) {
    cleanData.cycle = data.cycle
  }
  
  if (Object.keys(cleanData).length === 0) {
    throw new Error('Nenhum dado fornecido para atualização')
  }
  
  return await asaasClient.put<AsaasSubscription>(`/subscriptions/${subscriptionId}`, cleanData)
}

/**
 * Busca uma assinatura no Asaas pelo ID
 */
export async function getAsaasSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return await asaasClient.get<AsaasSubscription>(`/subscriptions/${subscriptionId}`)
}

/**
 * Lista as cobranças de uma assinatura no Asaas
 */
export async function getAsaasSubscriptionPayments(subscriptionId: string): Promise<{ data: AsaasPayment[] }> {
  const response = await asaasClient.get<any>(`/subscriptions/${subscriptionId}/payments`)
  
  // A API pode retornar diretamente um array ou um objeto com data
  if (Array.isArray(response)) {
    return { data: response }
  }
  
  return response
}

/**
 * Exclui uma assinatura no Asaas
 * 
 * @param subscriptionId - ID da assinatura no Asaas
 * @returns Objeto com informações sobre a exclusão
 */
export async function deleteAsaasSubscription(subscriptionId: string): Promise<{ deleted: boolean; id: string }> {
  try {
    await asaasClient.delete<{ deleted: boolean; id: string }>(`/subscriptions/${subscriptionId}`)
    return { deleted: true, id: subscriptionId }
  } catch (error: any) {
    // Se a assinatura já foi excluída ou não existe, considera sucesso
    if (error.message?.includes('404') || error.message?.includes('não encontrado')) {
      return { deleted: true, id: subscriptionId }
    }
    throw error
  }
}

