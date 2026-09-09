import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sports Vault',
        short_name: 'Sports Vault',
        description: 'Seu hub local para acompanhar times, atletas, jogos e insights esportivos.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f131c',
        background_color: '#0f131c',
        categories: ['sports', 'lifestyle', 'productivity'],
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/maskable-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sports-vault-api',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 10 * 60,
              },
              networkTimeoutSeconds: 6,
            },
          },
          {
            urlPattern: ({ request }) => ['font', 'image', 'style', 'script'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sports-vault-static',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('firebase')) return 'firebase'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
