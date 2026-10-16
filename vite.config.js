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
        globPatterns: ['**/*.{html,js,css,woff2,webp,png,svg,webmanifest,mp3}'],
        // the browser fetches the app's icons itself, when it's installed
        globIgnores: ['icons/**'],
        // A new version takes over as soon as it's installed, rather than
        // waiting for every tab and the installed app to close, which on a
        // phone might be never. A page already open keeps running what it
        // has; if it then can't fetch the game, it reloads (App.tsx).
        skipWaiting: true,
        clientsClaim: true,
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
