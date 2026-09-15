import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Vercel serves the app from the domain root, so base stays '/'.
  base: '/',
  plugins: [
    vue(),
    // Dev-only: bundling vue-devtools into production broke rendering on
    // some phone browsers (blank orange-tinted screen) and bloated the bundle.
    ...(mode === 'development' ? [vueDevTools()] : []),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'HULAGWAY',
        short_name: 'HULAGWAY',
        description:
          'Field data collection app for HULAGWAY community surveys and extension monitoring.',
        theme_color: '#F97316',
        background_color: '#FFF7ED',
        display: 'standalone',
        orientation: 'portrait',
        // Domain root (Vercel). Must match the served path or the installed
        // PWA opens outside the app scope.
        start_url: '/',
        // Icons are generated from /public/logo.png (HULAGWAY logo) — see public/pwa-*.png
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Purge precaches from older deployments: a stale phone-side service
        // worker serving an old index.html that references pruned hashed
        // assets is the classic "blank orange screen on phone, fine on laptop".
        cleanupOutdatedCaches: true,
        // Take control ASAP so a fixed deployment replaces the broken SW
        // without the user having to manually clear site data.
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        // Every app route must be listed — an omitted route (e.g. /login)
        // falls back to network instead of the app shell, which on an
        // installed PWA can render as a blank page.
        navigateFallbackAllowlist: [/^\/$/, /^\/login/, /^\/surveys/, /^\/pending-sync/, /^\/offline-records/, /^\/submitted-records/, /^\/sync-history/, /^\/profile/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(bunny\.net|gstatic\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
