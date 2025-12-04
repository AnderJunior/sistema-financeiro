import { getAsaasClient } from './client'
import { AsaasSubscription, AsaasApiResponse } from './types'

/**
 * Criar assinatura no Asaas
 */
export async function createSubscription(subscriptionData: {
  customer: string // ID do cliente no Asaas
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  nextDueDate: string // YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  description?: string
  externalReference?: string
}): Promise<AsaasSubscription> {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.post<AsaasSubscription>('/subscriptions', {
      customer: subscriptionData.customer,
      billingType: subscriptionData.billingType,
      value: subscriptionData.value,
      nextDueDate: subscriptionData.nextDueDate,
      cycle: subscriptionData.cycle,
      description: subscriptionData.description || `Assinatura ${subscriptionData.cycle.toLowerCase()}`,
      externalReference: subscriptionData.externalReference,
    })

    return response.data
  } catch (error: any) {
    console.error('Erro ao criar assinatura no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao criar assinatura no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

/**
 * Buscar assinatura por ID no Asaas
 */
export async function getSubscriptionById(subscriptionId: string): Promise<AsaasSubscription> {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.get<AsaasSubscription>(`/subscriptions/${subscriptionId}`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao buscar assinatura no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao buscar assinatura no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

/**
 * Atualizar assinatura no Asaas
 */
export async function updateSubscription(
  subscriptionId: string,
  subscriptionData: Partial<AsaasSubscription>
): Promise<AsaasSubscription> {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.put<AsaasSubscription>(
      `/subscriptions/${subscriptionId}`,
      subscriptionData
    )
    return response.data
  } catch (error: any) {
    console.error('Erro ao atualizar assinatura no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao atualizar assinatura no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

/**
 * Cancelar assinatura no Asaas
 */
export async function cancelSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.delete<AsaasSubscription>(`/subscriptions/${subscriptionId}`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao cancelar assinatura no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

/**
 * Listar pagamentos de uma assinatura
 */
export async function getSubscriptionPayments(subscriptionId: string) {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.get(`/subscriptions/${subscriptionId}/payments`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao listar pagamentos da assinatura:', error.response?.data || error.message)
    throw new Error(
      `Erro ao listar pagamentos: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

