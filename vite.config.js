import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // A service worker that keeps the whole site on the device, so the game
    // can be installed and played offline. src/index.tsx registers it.
    VitePWA({
      // registered by hand, never reloading the page under a game in progress
      injectRegister: false,
      // a new version takes over at once, and the page has it next time it opens
      registerType: 'autoUpdate',
      // public/manifest.webmanifest
      manifest: false,
      workbox: {
        // everything a game needs (browsers that can run it all read woff2)
        globPatterns: ['**/*.{html,js,css,woff2,webp,png,svg,webmanifest}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
