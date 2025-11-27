/**
 * Funções para gerenciar clientes no Asaas
 */

import { asaasClient } from './client'

export interface AsaasCustomer {
  object?: string
  id?: string
  dateCreated?: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  country?: string
  externalReference?: string
  notificationDisabled?: boolean
  additionalEmails?: string
  municipalInscription?: string
  stateInscription?: string
  canDelete?: boolean
  cannotBeDeletedReason?: string
  canEdit?: boolean
  cannotEditReason?: string
  personType?: 'FISICA' | 'JURIDICA'
  company?: string
  observations?: string
}

export interface CreateAsaasCustomerData {
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  country?: string
  externalReference?: string
  notificationDisabled?: boolean
  additionalEmails?: string
  municipalInscription?: string
  stateInscription?: string
  personType?: 'FISICA' | 'JURIDICA'
  company?: string
  observations?: string
}

export interface UpdateAsaasCustomerData extends Partial<CreateAsaasCustomerData> {}

/**
 * Remove caracteres especiais de CPF/CNPJ
 */
function cleanCPFCNPJ(cpfCnpj: string | null | undefined): string | undefined {
  if (!cpfCnpj) return undefined
  return cpfCnpj.replace(/\D/g, '')
}

/**
 * Remove caracteres especiais de telefone
 */
function cleanPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  return phone.replace(/\D/g, '')
}

/**
 * Converte tipo de pessoa do sistema para o formato do Asaas
 */
function convertPersonType(tipoPessoa: 'PF' | 'PJ'): 'FISICA' | 'JURIDICA' {
  return tipoPessoa === 'PF' ? 'FISICA' : 'JURIDICA'
}

/**
 * Cria um cliente no Asaas a partir dos dados do sistema
 * 
 * Campos obrigatórios no Asaas:
 * - name: Nome completo
 * - cpfCnpj: CPF ou CNPJ
 * - mobilePhone: Telefone celular
 */
export async function createAsaasCustomer(
  clienteData: {
    nome: string
    tipo_pessoa: 'PF' | 'PJ'
    cpf_cnpj?: string | null
    email?: string | null
    telefone?: string | null
    observacoes?: string | null
  },
  externalReference?: string
): Promise<AsaasCustomer> {
  // Valida campos obrigatórios do Asaas
  const cpfCnpj = cleanCPFCNPJ(clienteData.cpf_cnpj)
  const mobilePhone = cleanPhone(clienteData.telefone)

  if (!cpfCnpj) {
    throw new Error('CPF/CNPJ é obrigatório para criar cliente no Asaas')
  }

  if (!mobilePhone) {
    throw new Error('Telefone é obrigatório para criar cliente no Asaas')
  }

  const data: CreateAsaasCustomerData = {
    name: clienteData.nome,
    personType: convertPersonType(clienteData.tipo_pessoa),
    cpfCnpj: cpfCnpj,
    mobilePhone: mobilePhone,
    email: clienteData.email || undefined,
    phone: mobilePhone, // Também preenche o campo phone com o mesmo valor
    externalReference: externalReference,
    observations: clienteData.observacoes || undefined,
  }

  // Remove campos undefined
  Object.keys(data).forEach(key => {
    if (data[key as keyof CreateAsaasCustomerData] === undefined) {
      delete data[key as keyof CreateAsaasCustomerData]
    }
  })

  return await asaasClient.post<AsaasCustomer>('/customers', data)
}

/**
 * Busca um cliente no Asaas pelo ID
 */
export async function getAsaasCustomer(customerId: string): Promise<AsaasCustomer> {
  return await asaasClient.get<AsaasCustomer>(`/customers/${customerId}`)
}

/**
 * Atualiza um cliente no Asaas
 * 
 * Campos que podem ser atualizados:
 * - name: Nome completo
 * - cpfCnpj: CPF ou CNPJ
 * - email: E-mail
 * - phone: Telefone fixo
 * - mobilePhone: Telefone celular (obrigatório na criação, mas pode ser atualizado)
 * - observations: Observações
 * - personType: Tipo de pessoa (FISICA ou JURIDICA)
 * - E outros campos opcionais
 */
export async function updateAsaasCustomer(
  customerId: string,
  data: UpdateAsaasCustomerData
): Promise<AsaasCustomer> {
  // Remove campos undefined e null
  const cleanData: any = {}
  Object.keys(data).forEach(key => {
    const value = data[key as keyof UpdateAsaasCustomerData]
    if (value !== undefined && value !== null) {
      cleanData[key] = value
    }
  })

  // Se não houver dados para atualizar, retorna erro
  if (Object.keys(cleanData).length === 0) {
    throw new Error('Nenhum dado fornecido para atualização')
  }

  return await asaasClient.put<AsaasCustomer>(`/customers/${customerId}`, cleanData)
}

/**
 * Lista clientes no Asaas
 */
export async function listAsaasCustomers(params?: {
  name?: string
  email?: string
  cpfCnpj?: string
  externalReference?: string
  offset?: number
  limit?: number
}): Promise<{ object: string; hasMore: boolean; totalCount: number; limit: number; offset: number; data: AsaasCustomer[] }> {
  return await asaasClient.get('/customers', params)
}

/**
 * Busca um cliente no Asaas pelo externalReference (ID do sistema)
 */
export async function findAsaasCustomerByExternalReference(
  externalReference: string
): Promise<AsaasCustomer | null> {
  try {
    const result = await listAsaasCustomers({ externalReference })
    return result.data && result.data.length > 0 ? result.data[0] : null
  } catch (error) {
    return null
  }
}

/**
 * Exclui um cliente no Asaas
 * 
 * @param customerId - ID do cliente no Asaas
 * @returns Objeto com informações sobre a exclusão
 */
export async function deleteAsaasCustomer(customerId: string): Promise<{ deleted: boolean; id: string }> {
  try {
    await asaasClient.delete<{ deleted: boolean; id: string }>(`/customers/${customerId}`)
    return { deleted: true, id: customerId }
  } catch (error: any) {
    // Se o cliente já foi excluído ou não existe, considera sucesso
    if (error.message?.includes('404') || error.message?.includes('não encontrado')) {
      return { deleted: true, id: customerId }
    }
    throw error
  }
}

