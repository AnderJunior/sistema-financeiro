/**
 * Funções para gerenciar cobranças (payments) no Asaas
 */

import { asaasClient } from './client'

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
  [key: string]: any
}

export interface CreateAsaasPaymentData {
  customer: string
  billingType?: string
  value: number
  dueDate: string
  description?: string
}

/**
 * Cria uma cobrança no Asaas
 */
export async function createAsaasPayment(
  data: CreateAsaasPaymentData
): Promise<AsaasPayment> {
  const paymentData: any = {
    customer: data.customer,
    billingType: 'UNDEFINED',
    value: data.value,
    dueDate: data.dueDate,
  }

  // Adiciona description apenas se fornecido
  if (data.description) {
    paymentData.description = data.description
  }

  return await asaasClient.post<AsaasPayment>('/payments', paymentData)
}

/**
 * Cria uma cobrança no Asaas a partir dos dados do sistema
 */
export async function createAsaasPaymentFromService(
  asaasCustomerId: string,
  servicoData: {
    nome: string
    valor: number
    data_vencimento: string
  }
): Promise<AsaasPayment> {
  return await createAsaasPayment({
    customer: asaasCustomerId,
    value: servicoData.valor,
    dueDate: servicoData.data_vencimento,
    description: servicoData.nome,
  })
}

export interface UpdateAsaasPaymentData {
  dueDate?: string
  description?: string
  value?: number
}

/**
 * Atualiza uma cobrança no Asaas
 */
export async function updateAsaasPayment(
  paymentId: string,
  data: UpdateAsaasPaymentData
): Promise<AsaasPayment> {
  const cleanData: any = {}
  
  if (data.dueDate) {
    cleanData.dueDate = data.dueDate
  }
  
  if (data.description !== undefined) {
    cleanData.description = data.description
  }
  
  if (data.value !== undefined) {
    cleanData.value = data.value
  }
  
  if (Object.keys(cleanData).length === 0) {
    throw new Error('Nenhum dado fornecido para atualização')
  }
  
  return await asaasClient.put<AsaasPayment>(`/payments/${paymentId}`, cleanData)
}

/**
 * Busca uma cobrança no Asaas pelo ID
 */
export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return await asaasClient.get<AsaasPayment>(`/payments/${paymentId}`)
}

/**
 * Exclui uma cobrança no Asaas
 * 
 * @param paymentId - ID da cobrança no Asaas
 * @returns Objeto com informações sobre a exclusão
 */
export async function deleteAsaasPayment(paymentId: string): Promise<{ deleted: boolean; id: string }> {
  try {
    await asaasClient.delete<{ deleted: boolean; id: string }>(`/payments/${paymentId}`)
    return { deleted: true, id: paymentId }
  } catch (error: any) {
    // Se a cobrança já foi excluída ou não existe, considera sucesso
    if (error.message?.includes('404') || error.message?.includes('não encontrado')) {
      return { deleted: true, id: paymentId }
    }
    throw error
  }
}

