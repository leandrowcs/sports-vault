import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Vite's dev server doesn't run Vercel serverless functions, so /api/sports would 404
// (or fall through to index.html) locally. This middleware runs the same handler in-process.
function sportsApiDevMiddleware(): Plugin {
  return {
    name: 'sports-api-dev-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/sports', async (req, res) => {
        try {
          const require = createRequire(import.meta.url)
          delete require.cache[require.resolve('../api/sports.js')]
          const handler = require('../api/sports.js')
          const url = new URL(req.url ?? '', 'http://localhost')
          const query = Object.fromEntries(url.searchParams.entries())
          await handler(
            { method: req.method, query },
            {
              setHeader: (key: string, value: string) => res.setHeader(key, value),
              status(code: number) {
                res.statusCode = code
                return this
              },
              json(payload: unknown) {
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify(payload))
              },
            },
          )
        } catch (error) {
          res.statusCode = 502
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Sports API failed' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sportsApiDevMiddleware(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-16.png', 'favicon-32.png', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
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
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
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
