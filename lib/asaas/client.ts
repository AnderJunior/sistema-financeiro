import axios, { AxiosInstance } from 'axios'

// Cliente HTTP para comunicação com a API do Asaas
class AsaasClient {
  private client: AxiosInstance
  private apiKey: string
  private baseURL: string

  constructor() {
    // Usar sandbox em desenvolvimento, produção em produção
    const isProduction = process.env.NODE_ENV === 'production' && process.env.ASAAS_ENVIRONMENT === 'production'
    this.baseURL = isProduction 
      ? 'https://api.asaas.com/v3' 
      : 'https://api-sandbox.asaas.com/v3'
    
    this.apiKey = process.env.ASAAS_API_KEY || ''
    
    if (!this.apiKey) {
      throw new Error('ASAAS_API_KEY não configurada nas variáveis de ambiente')
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 segundos
    })

    // Interceptor para log de erros
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Erro na API Asaas:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })
        return Promise.reject(error)
      }
    )
  }

  getClient(): AxiosInstance {
    return this.client
  }

  getBaseURL(): string {
    return this.baseURL
  }
}

// Singleton para reutilizar a instância
let asaasClientInstance: AsaasClient | null = null

export function getAsaasClient(): AsaasClient {
  if (!asaasClientInstance) {
    asaasClientInstance = new AsaasClient()
  }
  return asaasClientInstance
}

export default getAsaasClient

