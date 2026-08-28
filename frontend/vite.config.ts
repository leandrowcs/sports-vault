import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Sports Vault', short_name: 'Sports Vault', start_url: '/', display: 'standalone', theme_color: '#2563eb', background_color: '#eef4ff', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }] } })],
})
