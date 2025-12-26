# Logos do Sistema

Esta pasta contém todos os logos e imagens do sistema que serão distribuídos e utilizados em diferentes partes da aplicação.

## Estrutura Recomendada

Organize os logos da seguinte forma:

```
logos/
├── logo.svg          # Logo principal (SVG - recomendado)
├── logo.png          # Logo principal (PNG)
├── logo-white.svg    # Logo em versão branca (para fundos escuros)
├── logo-white.png    # Logo em versão branca (PNG)
├── favicon.ico       # Favicon do sistema
├── icon-192.png      # Ícone 192x192 (PWA)
├── icon-512.png      # Ícone 512x512 (PWA)
└── README.md         # Este arquivo
```

## Como Usar no Next.js

### Em Componentes React/TSX

```tsx
import Image from 'next/image'

// Usando o componente Image do Next.js
<Image 
  src="/logos/logo.png" 
  alt="Logo do Sistema" 
  width={200} 
  height={50}
/>

// Ou usando tag img tradicional
<img src="/logos/logo.svg" alt="Logo do Sistema" />
```

### Em CSS

```css
.logo {
  background-image: url('/logos/logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
}
```

### Em HTML (landing pages, etc)

```html
<img src="/logos/logo.png" alt="Logo do Sistema" />
```

## Formatos Recomendados

- **SVG**: Para logos vetoriais (escaláveis, melhor qualidade)
- **PNG**: Para logos com transparência
- **ICO**: Para favicons
- **WebP**: Para otimização de imagens (se necessário)

## Tamanhos Sugeridos

- Logo principal: 200x50px ou proporcional
- Logo grande: 400x100px
- Favicon: 32x32px ou 16x16px
- Ícones PWA: 192x192px e 512x512px

## Notas

- Todos os arquivos nesta pasta são servidos estaticamente pelo Next.js
- O caminho sempre começa com `/logos/` (sem `public`)
- Mantenha os arquivos organizados e com nomes descritivos
- Use versões otimizadas para melhor performance





