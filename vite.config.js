import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Rv/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'RV - Gestion de comptoir',
        short_name: 'RV',
        description: 'Application de gestion de comptoir',
        theme_color: '#78716c',
        background_color: '#fafaf9',
        display: 'standalone',
        scope: '/Rv/',
        start_url: '/Rv/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/Rv/index.html'
      }
    })
  ],
})
