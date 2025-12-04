# Dockerfile para Next.js em produção
FROM node:20-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
# Usar npm ci para instalação limpa e reproduzível
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit || npm install --legacy-peer-deps

# Reconstruir o código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app

# Copiar node_modules do stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copiar arquivos de configuração primeiro
COPY package.json package-lock.json* ./
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY middleware.ts ./
COPY next-env.d.ts ./

# Copiar diretórios do código fonte
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY contexts ./contexts
COPY types ./types
COPY supabase ./supabase
COPY scripts ./scripts

# Copiar public se existir, caso contrário criar diretório vazio
RUN mkdir -p ./public
COPY public ./public/ 2>/dev/null || true

# Garantir permissões de execução nos binários do node_modules
RUN chmod -R +x node_modules/.bin || true

# Variáveis de ambiente para build (se necessário)
# As variáveis NEXT_PUBLIC_* devem ser fornecidas no build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Desabilitar telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build da aplicação
RUN npm run build

# Verificar se o build foi bem-sucedido
RUN test -d .next/standalone || (echo "ERRO: Build standalone não foi gerado! Verifique se next.config.js tem output: 'standalone'" && exit 1)
RUN test -f .next/standalone/server.js || (echo "ERRO: server.js não encontrado no standalone!" && exit 1)

# Imagem de produção, copiar todos os arquivos e executar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Instalar dependências necessárias para verificação de licença
RUN apk add --no-cache curl dcron jq bash

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar arquivos de build standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar docker-entrypoint.sh e torná-lo executável
COPY --chown=nextjs:nextjs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Criar diretório para logs
RUN mkdir -p /var/log && chown nextjs:nodejs /var/log

# Verificar se server.js existe antes de continuar
RUN test -f /app/server.js || (echo "ERRO: server.js não encontrado no diretório /app!" && exit 1)

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usar entrypoint para verificação de licença antes de iniciar
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
