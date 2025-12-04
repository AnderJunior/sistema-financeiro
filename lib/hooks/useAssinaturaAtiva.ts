/**
 * Hook para verificar assinatura ativa
 * Usa o contexto AssinaturaContext para evitar múltiplas requisições
 * 
 * Este hook agora é um wrapper do contexto, garantindo que a verificação
 * seja feita apenas uma vez e compartilhada entre todas as páginas
 */
export { useAssinaturaAtiva } from '@/contexts/AssinaturaContext'


