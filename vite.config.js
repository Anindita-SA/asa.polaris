import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
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
          { src: '/asa.polaris/pwa-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
          { src: '/asa.polaris/pwa-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
          { src: '/asa.polaris/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  base: '/asa.polaris/',
})
