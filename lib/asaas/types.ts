// Tipos TypeScript para integração com Asaas

export interface AsaasCustomer {
  id?: string
  name: string
  email: string
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
}

export interface AsaasSubscription {
  id?: string
  customer: string // ID do cliente
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  nextDueDate: string // YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  description?: string
  endDate?: string // YYYY-MM-DD
  maxPayments?: number
  externalReference?: string
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELED'
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
    totalValue?: number
  }>
}

export interface AsaasPayment {
  id?: string
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  dueDate: string // YYYY-MM-DD
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  discount?: {
    value: number
    dueDateLimitDays: number
    type: 'FIXED' | 'PERCENTAGE'
  }
  interest?: {
    value: number
    type: 'PERCENTAGE'
  }
  fine?: {
    value: number
    type: 'FIXED' | 'PERCENTAGE'
  }
  postalService?: boolean
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
    totalValue?: number
  }>
}

export interface AsaasWebhookEvent {
  event: 
    | 'PAYMENT_CREATED'
    | 'PAYMENT_AWAITING_RISK_ANALYSIS'
    | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
    | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_ANTICIPATED'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_DELETED'
    | 'PAYMENT_RESTORED'
    | 'PAYMENT_REFUNDED'
    | 'PAYMENT_CHARGEBACK_REQUESTED'
    | 'PAYMENT_CHARGEBACK_DISPUTE'
    | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
    | 'PAYMENT_DUNNING_RECEIVED'
    | 'PAYMENT_DUNNING_REQUESTED'
    | 'PAYMENT_BANK_SLIP_VIEWED'
    | 'PAYMENT_CHECKOUT_VIEWED'
  payment?: AsaasPayment
  subscription?: AsaasSubscription
}

export interface AsaasApiResponse<T> {
  object: string
  hasMore?: boolean
  totalCount?: number
  limit?: number
  offset?: number
  data?: T[]
  [key: string]: any
}

