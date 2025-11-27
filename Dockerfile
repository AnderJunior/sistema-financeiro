# Dockerfile para Next.js em produção
FROM node:20-alpine AS base

# Instalar dependências apenas quando necessário
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
# Usar npm install com --legacy-peer-deps para resolver conflitos de dependências
RUN npm install --legacy-peer-deps

# Reconstruir o código fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Garantir permissões de execução nos binários do node_modules
RUN chmod -R +x node_modules/.bin || true

# Variáveis de ambiente para build (se necessário)
# As variáveis NEXT_PUBLIC_* devem ser fornecidas no build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_ASAAS_ENVIRONMENT

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_ASAAS_ENVIRONMENT=$NEXT_PUBLIC_ASAAS_ENVIRONMENT

# Desabilitar telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build da aplicação
RUN npx next build

# Imagem de produção, copiar todos os arquivos e executar next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=builder /app/public ./public

# Copiar arquivos de build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

