import { getAsaasClient } from './client'
import { AsaasCustomer, AsaasApiResponse } from './types'

/**
 * Criar ou buscar cliente no Asaas
 * Se o cliente já existir (por email ou CPF/CNPJ), retorna o existente
 */
export async function createOrGetCustomer(customerData: {
  name: string
  email: string
  phone?: string
  cpfCnpj?: string
  externalReference?: string
}): Promise<AsaasCustomer> {
  const client = getAsaasClient().getClient()

  try {
    // Primeiro, tentar buscar cliente existente por email ou CPF/CNPJ
    if (customerData.email || customerData.cpfCnpj) {
      const searchParams = new URLSearchParams()
      if (customerData.email) {
        searchParams.append('email', customerData.email)
      }
      if (customerData.cpfCnpj) {
        searchParams.append('cpfCnpj', customerData.cpfCnpj.replace(/\D/g, ''))
      }

      const searchResponse = await client.get<AsaasApiResponse<AsaasCustomer>>(
        `/customers?${searchParams.toString()}`
      )

      if (searchResponse.data.data && searchResponse.data.data.length > 0) {
        // Cliente já existe, retornar o primeiro resultado
        return searchResponse.data.data[0]
      }
    }

    // Cliente não existe, criar novo
    const response = await client.post<AsaasCustomer>('/customers', {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      cpfCnpj: customerData.cpfCnpj?.replace(/\D/g, ''), // Remove formatação
      externalReference: customerData.externalReference,
    })

    return response.data
  } catch (error: any) {
    console.error('Erro ao criar/buscar cliente no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao criar cliente no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

/**
 * Buscar cliente por ID no Asaas
 */
export async function getCustomerById(customerId: string): Promise<AsaasCustomer> {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.get<AsaasCustomer>(`/customers/${customerId}`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao buscar cliente no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao buscar cliente no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

/**
 * Atualizar cliente no Asaas
 */
export async function updateCustomer(
  customerId: string,
  customerData: Partial<AsaasCustomer>
): Promise<AsaasCustomer> {
  const client = getAsaasClient().getClient()

  try {
    const response = await client.put<AsaasCustomer>(`/customers/${customerId}`, customerData)
    return response.data
  } catch (error: any) {
    console.error('Erro ao atualizar cliente no Asaas:', error.response?.data || error.message)
    throw new Error(
      `Erro ao atualizar cliente no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`
    )
  }
}

