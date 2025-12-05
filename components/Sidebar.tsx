'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FolderTree, 
  Building2,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  Tag,
  UserCircle,
  UsersRound,
  Wallet,
  Zap,
  CheckSquare,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  href?: string
  label: string
  icon: any
  subItems?: { href: string; label: string; icon: any }[]
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { 
    label: 'Meus Clientes', 
    icon: Users,
    subItems: [
      { href: '/clientes', label: 'Clientes', icon: UserCircle },
      { href: '/grupos', label: 'Grupos', icon: UsersRound },
    ]
  },
  { href: '/projetos', label: 'Projetos', icon: FolderTree },
  { 
    label: 'Tarefas', 
    icon: CheckSquare,
    subItems: [
      { href: '/tarefas', label: 'Lista de Tarefas', icon: CheckSquare },
      { href: '/tarefas/calendario', label: 'Calendário', icon: Calendar },
    ]
  },
  { 
    label: 'Empresa', 
    icon: Building2,
    subItems: [
      { href: '/empresa/todas', label: 'Financeiro', icon: FileText },
      { href: '/empresa/contas', label: 'Contas', icon: Wallet },
      { href: '/empresa/servicos', label: 'Serviços', icon: Briefcase },
      { href: '/empresa/categorias', label: 'Categorias', icon: Tag },
    ]
  },
  { href: '/automacoes', label: 'Automações', icon: Zap },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Expandir automaticamente itens que têm sub-itens ativos
  useEffect(() => {
    const newExpanded = new Set<string>()
    menuItems.forEach((item) => {
      if (item.subItems) {
        const hasActiveSubItem = item.subItems.some(
          (subItem) => pathname === subItem.href || pathname?.startsWith(subItem.href + '/')
        )
        if (hasActiveSubItem) {
          newExpanded.add(item.label)
        }
      }
    })
    setExpandedItems(newExpanded)
  }, [pathname])

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(label)) {
        newSet.delete(label)
      } else {
        newSet.add(label)
      }
      return newSet
    })
  }

  const isItemActive = (item: MenuItem) => {
    if (item.href) {
      return pathname === item.href || pathname?.startsWith(item.href + '/')
    }
    if (item.subItems) {
      return item.subItems.some(
        (subItem) => pathname === subItem.href || pathname?.startsWith(subItem.href + '/')
      )
    }
    return false
  }

  const isSubItemActive = (href: string, allSubItems?: { href: string; label: string; icon: any }[]) => {
    // Verificar se é exatamente igual
    if (pathname === href) {
      return true
    }
    
    // Verificar se começa com o href seguido de /
    if (pathname?.startsWith(href + '/')) {
      // Se há outros subitens, verificar se algum deles corresponde melhor ao pathname
      if (allSubItems) {
        // Verificar se há um subitem que corresponde exatamente ao pathname
        const exactMatch = allSubItems.some(
          (subItem) => subItem.href !== href && pathname === subItem.href
        )
        // Se há um match exato em outro subitem, este não está ativo
        if (exactMatch) {
          return false
        }
        
        // Verificar se há um subitem mais específico (cujo href é mais longo e o pathname começa com ele)
        const moreSpecificMatch = allSubItems.some(
          (subItem) => subItem.href !== href && 
                       subItem.href.length > href.length && 
                       (pathname === subItem.href || pathname?.startsWith(subItem.href + '/'))
        )
        // Se há um match mais específico, este não está ativo
        if (moreSpecificMatch) {
          return false
        }
      }
      return true
    }
    
    return false
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <Link href="/dashboard" className="flex justify-center">
          <Image
            src="/logos/para-fundos-escuros-vertical.png"
            alt="Logo do Sistema"
            width={120}
            height={40}
            className="h-auto"
            priority
          />
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = isItemActive(item)
          const isExpanded = expandedItems.has(item.label)
          const hasSubItems = item.subItems && item.subItems.length > 0

          if (hasSubItems) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-700 space-y-1">
                    {item.subItems!.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = isSubItemActive(subItem.href, item.subItems)
                      
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                            isSubActive
                              ? 'bg-primary-600/70 text-white'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                          )}
                        >
                          <SubIcon className="w-4 h-4" />
                          <span>{subItem.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link
          href="/configuracoes"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            pathname === '/configuracoes' || pathname?.startsWith('/configuracoes/')
              ? 'bg-primary-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configurações</span>
        </Link>
      </div>
    </aside>
  )
}
