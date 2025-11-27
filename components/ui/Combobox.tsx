'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  onSearch?: (searchTerm: string) => void
  onCreateNew?: (value: string) => void
  className?: string
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Digite para buscar...',
  onSearch,
  onCreateNew,
  className = '',
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtrar opções baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options)
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredOptions(filtered)
    }
  }, [searchTerm, options])

  // Fechar quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setIsOpen(true)
    onSearch?.(newValue)
  }

  const handleSelectOption = (option: string) => {
    onChange(option)
    setIsOpen(false)
    setSearchTerm('')
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmedSearch = searchTerm.trim()
      
      if (trimmedSearch) {
        // Verificar se já existe nas opções (comparação case-insensitive)
        const exists = options.some(opt => opt.toLowerCase() === trimmedSearch.toLowerCase())
        
        if (!exists) {
          // Criar nova opção
          onCreateNew?.(trimmedSearch)
        }
        // Sempre atualizar o valor (mesmo se existir, para garantir que está correto)
        onChange(trimmedSearch)
        
        setIsOpen(false)
        setSearchTerm('')
        inputRef.current?.blur()
      } else {
        // Se estiver vazio, apenas fechar
        setIsOpen(false)
        setSearchTerm('')
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      // Focar no primeiro item da lista se houver
      const firstOption = containerRef.current?.querySelector('[role="option"]') as HTMLElement
      firstOption?.focus()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
    inputRef.current?.focus()
  }

  const displayValue = isOpen ? searchTerm : value

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true)
            setSearchTerm(value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={index}
                  role="option"
                  onClick={() => handleSelectOption(option)}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors text-black"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSelectOption(option)
                    }
                  }}
                >
                  {option}
                </li>
              ))}
            </ul>
          ) : searchTerm.trim() ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              <div className="mb-2">Nenhuma opção encontrada</div>
              <div className="text-xs text-gray-400">
                Pressione Enter para criar "{searchTerm.trim()}"
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Digite para buscar...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

