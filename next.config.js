/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Garantir que arquivos estáticos sejam incluídos
  images: {
    unoptimized: true,
  },

  // Configurações de produção
  poweredByHeader: false,
  compress: true,
  
  // Garantir que o standalone funcione corretamente
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*'],
    },
  },
};

module.exports = nextConfig;