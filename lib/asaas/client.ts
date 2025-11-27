/**
 * Cliente HTTP para comunicação com a API do Asaas
 */

import { getAsaasBaseUrl, getAsaasApiToken } from './config'

export interface AsaasApiError {
  errors?: Array<{
    code: string
    description: string
  }>
  message?: string
}

export interface AsaasApiResponse<T> {
  object?: string
  hasMore?: boolean
  totalCount?: number
  limit?: number
  offset?: number
  data?: T
  [key: string]: any
}

/**
 * Classe para fazer requisições à API do Asaas
 */
export class AsaasClient {
  private baseUrl: string
  private apiToken: string

  constructor() {
    this.baseUrl = getAsaasBaseUrl()
    this.apiToken = getAsaasApiToken()
  }

  /**
   * Faz uma requisição GET
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'access_token': this.apiToken,
        'Content-Type': 'application/json',
      },
    })

    return this.handleResponse<T>(response)
  }

  /**
   * Faz uma requisição POST
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'access_token': this.apiToken,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  /**
   * Faz uma requisição PUT
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'access_token': this.apiToken,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  /**
   * Faz uma requisição DELETE
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'access_token': this.apiToken,
        'Content-Type': 'application/json',
      },
    })

    return this.handleResponse<T>(response)
  }

  /**
   * Trata a resposta da API
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    let data: any
    if (isJson) {
      data = await response.json()
    } else {
      const text = await response.text()
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Erro na resposta da API: ${text}`)
      }
    }

    if (!response.ok) {
      const error: AsaasApiError = data
      const errorMessage = error.errors?.[0]?.description || error.message || 'Erro desconhecido'
      throw new Error(`Asaas API Error (${response.status}): ${errorMessage}`)
    }

    return data as T
  }
}

/**
 * Instância singleton do cliente Asaas
 */
export const asaasClient = new AsaasClient()

