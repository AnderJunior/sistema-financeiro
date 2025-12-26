import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  // Se for string no formato YYYY-MM-DD, tratar como data local (sem conversão de timezone)
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [ano, mes, dia] = date.split('-')
    // Criar data local (não UTC) para evitar problemas de timezone
    const dataLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
    return new Intl.DateTimeFormat('pt-BR').format(dataLocal)
  }
  // Para outros formatos, usar conversão normal
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDateLong(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Converte uma string de data para um objeto Date, tratando corretamente o timezone.
 * Se a data não tiver hora, define como 09:00 da manhã no timezone local.
 * @param dateString - String de data no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
 * @returns Date object no timezone local
 */
export function parseDateForCalendar(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  // Se for apenas data (YYYY-MM-DD), adicionar hora 09:00
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [ano, mes, dia] = dateString.split('-')
    // Criar data local às 09:00 da manhã
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), 9, 0, 0)
  }
  
  // Se já tiver hora, usar normalmente mas garantir que seja tratada como local
  const date = new Date(dateString)
  // Se a data foi interpretada como UTC, ajustar para local
  if (dateString.includes('T') && !dateString.includes('+') && !dateString.includes('Z')) {
    // String sem timezone, assumir que é local
    return date
  }
  
  return date
}

/**
 * Prepara uma data para salvar no banco, garantindo que se não tiver hora, seja 09:00
 * @param dateString - String de data no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
 * @returns String no formato YYYY-MM-DDTHH:mm:ss para salvar no banco
 */
export function prepareDateForSave(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  
  // Se for apenas data (YYYY-MM-DD), adicionar hora 09:00
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return `${dateString}T09:00:00`
  }
  
  // Se já tiver hora, retornar como está
  return dateString
}

export function maskCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return value
}

export function maskCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 14) {
    return cleaned
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
  return value
}

export function maskCPFCNPJ(value: string, tipoPessoa: 'PF' | 'PJ'): string {
  if (tipoPessoa === 'PF') {
    return maskCPF(value)
  }
  return maskCNPJ(value)
}

/**
 * Formata um valor numérico como moeda brasileira (R$)
 * @param value - String com o valor digitado
 * @returns String formatada como R$ 0,00
 */
export function formatCurrencyInput(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Converte para número e divide por 100 para ter centavos
  const amount = parseFloat(numbers) / 100
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Extrai o valor numérico de uma string formatada como moeda
 * @param formattedValue - String formatada como R$ 0,00
 * @returns Número com o valor
 */
export function parseCurrencyValue(formattedValue: string): number {
  const numbers = formattedValue.replace(/\D/g, '')
  if (!numbers) return 0
  return parseFloat(numbers) / 100
}

/**
 * Formata um número de telefone no formato (99) 9 9999-9999
 * @param value - String com o número digitado
 * @returns String formatada como (99) 9 9999-9999
 */
export function maskPhone(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Aplica a máscara (99) 9 9999-9999
  if (numbers.length <= 2) {
    return `(${numbers}`
  } else if (numbers.length <= 3) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }
}

