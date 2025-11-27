/**
 * Configuração da API do Asaas
 */

export const ASAAS_CONFIG = {
  // URLs da API
  SANDBOX_URL: 'https://api-sandbox.asaas.com/v3',
  PRODUCTION_URL: 'https://api.asaas.com/v3',
  
  // Ambiente atual (sandbox ou production)
  ENVIRONMENT: (process.env.NEXT_PUBLIC_ASAAS_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  
  // Token de API (sandbox ou production)
  // Para sandbox, use o token fornecido
  API_TOKEN: process.env.ASAAS_API_TOKEN || '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjM5MGFmNDMwLTMzZmYtNGNkNi1hOTRkLWQ5MTEwMDMzNzAyZTo6JGFhY2hfOGFjNjJlMTEtM2U2Ny00OWI4LTgyMDEtZDAxYmUzOGY4YmY4',
}

/**
 * Retorna a URL base da API baseada no ambiente
 */
export function getAsaasBaseUrl(): string {
  return ASAAS_CONFIG.ENVIRONMENT === 'production' 
    ? ASAAS_CONFIG.PRODUCTION_URL 
    : ASAAS_CONFIG.SANDBOX_URL
}

/**
 * Retorna o token de API
 */
export function getAsaasApiToken(): string {
  return ASAAS_CONFIG.API_TOKEN
}

