# Landing Page - GestãoPro

Landing page moderna e responsiva para o sistema de gestão, inspirada no design do ClickUp.

## 📁 Arquivos

- `landing.html` - Estrutura HTML da página
- `landing.css` - Estilos e animações
- `landing.js` - Interatividade e animações JavaScript

## 🚀 Como usar

### Opção 1: Abrir diretamente no navegador
Simplesmente abra o arquivo `landing.html` no seu navegador.

### Opção 2: Servidor local
Para testar com um servidor local (recomendado):

```bash
# Com Python
python -m http.server 8000

# Com Node.js (http-server)
npx http-server -p 8000

# Com PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000/landing.html`

### Opção 3: Integrar com Next.js
Se quiser integrar com o projeto Next.js, você pode:

1. Mover os arquivos para a pasta `public/`
2. Acessar via `/landing.html`
3. Ou criar uma rota Next.js que renderize o conteúdo

## 🎨 Características

- ✅ Design moderno inspirado no ClickUp
- ✅ Totalmente responsivo (mobile, tablet, desktop)
- ✅ Animações suaves e interativas
- ✅ Copy persuasiva focada em freelancers e pequenas empresas
- ✅ Seção de recursos com ícones
- ✅ Screenshots/prints do sistema (placeholders prontos para substituir)
- ✅ Seção de planos (Básico R$ 49 e Pro R$ 99)
- ✅ Botões de planos desabilitados (conforme solicitado)
- ✅ Navegação fixa com efeito de scroll
- ✅ Footer completo

## 📝 Personalização

### Substituir Screenshots
Os screenshots atuais são placeholders. Para adicionar imagens reais:

1. Adicione suas imagens na pasta `public/images/` (ou similar)
2. Substitua os elementos `.screenshot-content` por tags `<img>`
3. Ou mantenha os placeholders e adicione imagens de fundo via CSS

### Alterar Cores
As cores principais estão definidas em `landing.css` nas variáveis CSS:

```css
:root {
    --primary: #6366F1;
    --secondary: #8B5CF6;
    /* ... */
}
```

### Modificar Textos
Todos os textos estão em `landing.html` e podem ser facilmente editados.

## 🔗 Links

- Link "Entrar" aponta para `/login` (ajuste conforme necessário)
- Links de navegação usam âncoras (#recursos, #precos, etc.)
- Links do footer são placeholders (#sobre, #blog, etc.)

## 📱 Responsividade

A landing page é totalmente responsiva e se adapta a:
- Mobile (< 768px)
- Tablet (768px - 1024px)
- Desktop (> 1024px)

## ⚡ Performance

- CSS e JS são arquivos separados para melhor cache
- Animações otimizadas com CSS transforms
- Lazy loading preparado para imagens futuras
- Sem dependências externas pesadas (apenas Google Fonts)

## 🎯 Próximos Passos

1. Adicionar screenshots reais do sistema
2. Conectar botões de planos quando estiver pronto
3. Adicionar formulário de contato se necessário
4. Integrar com analytics (Google Analytics, etc.)
5. Adicionar meta tags para SEO
6. Otimizar imagens quando adicionar screenshots reais

