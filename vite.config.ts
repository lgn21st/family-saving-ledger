import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/home-bank.svg'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Home Bank',
        short_name: 'Home Bank',
        description: 'Family savings ledger',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f9fc',
        theme_color: '#1f5a85',
        icons: [
          {
            src: '/icons/home-bank.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true
  }
})
