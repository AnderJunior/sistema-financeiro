# ---------------- BASE ----------------
    FROM node:20-alpine AS base
    WORKDIR /app
    
    # Desabilitar telemetria do Next.js
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # ---------------- DEPS ----------------
    FROM base AS deps
    
    # Dependências de build
    RUN apk add --no-cache libc6-compat python3 make g++
    
    WORKDIR /app
    
    # Copiar arquivos de dependências
    COPY package.json package-lock.json* ./
    
    # Instalar dependências
    RUN npm ci --legacy-peer-deps --prefer-offline --no-audit || \
        npm install --legacy-peer-deps
    
    # ---------------- BUILDER ----------------
    FROM base AS builder
    WORKDIR /app
    
    # Copiar node_modules do stage de deps
    COPY --from=deps /app/node_modules ./node_modules
    
    # Copiar arquivos de configuração
    COPY package.json package-lock.json* ./
    COPY next.config.js ./
    COPY tsconfig.json ./
    COPY tailwind.config.ts ./
    COPY postcss.config.js ./
    COPY middleware.ts ./
    COPY next-env.d.ts ./
    
    # Copiar código fonte
    COPY app ./app
    COPY components ./components
    COPY lib ./lib
    COPY hooks ./hooks
    COPY contexts ./contexts
    COPY types ./types
    COPY supabase ./supabase
    COPY scripts ./scripts
    
    # Copiar public (se existir)
    RUN mkdir -p ./public
    COPY public ./public/
    
    # Variáveis de build (se precisar mesmo no build)
    ARG NEXT_PUBLIC_SUPABASE_URL
    ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
    ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
    ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    # Build da aplicação
    RUN npm run build
    
    # Garantir que o build standalone foi gerado
    RUN test -d .next/standalone || (echo "ERRO: Build standalone não foi gerado! Verifique seu next.config.js (output: 'standalone')." && exit 1)
    RUN test -f .next/standalone/server.js || (echo "ERRO: server.js não encontrado em .next/standalone!" && exit 1)
    
    # ---------------- RUNNER ----------------
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    ENV PORT=3000
    ENV HOSTNAME=0.0.0.0
    
    # Usuário não-root
    RUN addgroup --system --gid 1001 nodejs && \
        adduser  --system --uid 1001 nextjs
    
    # Copiar build standalone e assets públicos
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./      # aqui vem o server.js
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    
    USER nextjs
    
    EXPOSE 3000
    
    # Aqui é o ponto crucial: rodar o server standalone
    CMD ["node", "server.js"]    