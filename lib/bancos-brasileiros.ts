// Lista de bancos brasileiros com suas cores e códigos
import { 
  Building2, 
  CreditCard, 
  Wallet, 
  Banknote, 
  Landmark,
  PiggyBank,
  Coins,
  CircleDollarSign,
  Gem,
  Sparkles,
  Building,
  Store,
  Briefcase,
  type LucideIcon
} from 'lucide-react'

export interface BancoInfo {
  codigo: string
  nome: string
  cor: string
  corTexto: string
  icon?: LucideIcon
}

export const BANCOS_BRASILEIROS: BancoInfo[] = [
  { codigo: '001', nome: 'Banco do Brasil', cor: '#FFB81C', corTexto: '#000000', icon: Landmark },
  { codigo: '033', nome: 'Santander', cor: '#EC0000', corTexto: '#FFFFFF', icon: Building2 },
  { codigo: '104', nome: 'Caixa Econômica Federal', cor: '#00468B', corTexto: '#FFFFFF', icon: Building },
  { codigo: '237', nome: 'Bradesco', cor: '#CC092F', corTexto: '#FFFFFF', icon: Building2 },
  { codigo: '341', nome: 'Itaú', cor: '#FF6B35', corTexto: '#FFFFFF', icon: Building2 },
  { codigo: '260', nome: 'Nubank', cor: '#8A05BE', corTexto: '#FFFFFF', icon: CreditCard },
  { codigo: '290', nome: 'PagBank', cor: '#00A859', corTexto: '#FFFFFF', icon: Wallet },
  { codigo: '336', nome: 'C6 Bank', cor: '#000000', corTexto: '#FFFFFF', icon: CircleDollarSign },
  { codigo: '422', nome: 'Banco Safra', cor: '#EC7000', corTexto: '#FFFFFF', icon: Building2 },
  { codigo: '077', nome: 'Inter', cor: '#FF7A00', corTexto: '#FFFFFF', icon: Sparkles },
  { codigo: '212', nome: 'Original', cor: '#FF6B00', corTexto: '#FFFFFF', icon: Gem },
  { codigo: '208', nome: 'BTG Pactual', cor: '#000000', corTexto: '#FFFFFF', icon: Briefcase },
  { codigo: '655', nome: 'Neon', cor: '#00D9FF', corTexto: '#000000', icon: Sparkles },
  { codigo: '197', nome: 'Stone', cor: '#000000', corTexto: '#FFFFFF', icon: Store },
  { codigo: '085', nome: 'Cooperativa Sicredi', cor: '#00A859', corTexto: '#FFFFFF', icon: PiggyBank },
  { codigo: '748', nome: 'Sicredi', cor: '#00A859', corTexto: '#FFFFFF', icon: PiggyBank },
  { codigo: '756', nome: 'Sicoob', cor: '#003087', corTexto: '#FFFFFF', icon: Coins },
  { codigo: '070', nome: 'BRB', cor: '#FFB81C', corTexto: '#000000', icon: Landmark },
  { codigo: '341', nome: 'Itaú Unibanco', cor: '#FF6B35', corTexto: '#FFFFFF', icon: Building2 },
  { codigo: '999', nome: 'Outro', cor: '#6B7280', corTexto: '#FFFFFF', icon: Building2 },
]

export function getBancoByCodigo(codigo: string | null): BancoInfo | undefined {
  return BANCOS_BRASILEIROS.find(b => b.codigo === codigo)
}

export function getBancoByNome(nome: string): BancoInfo | undefined {
  const nomeLower = nome.toLowerCase()
  return BANCOS_BRASILEIROS.find(b => 
    b.nome.toLowerCase().includes(nomeLower) || 
    nomeLower.includes(b.nome.toLowerCase())
  )
}

