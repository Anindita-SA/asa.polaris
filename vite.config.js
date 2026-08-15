import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Polaris ASA',
        short_name: 'Polaris',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        start_url: '/asa.polaris/',
        scope: '/asa.polaris/',
        icons: [
          { src: '/asa.polaris/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/asa.polaris/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/asa.polaris/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  base: '/asa.polaris/',
})
