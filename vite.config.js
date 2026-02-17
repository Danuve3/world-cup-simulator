import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  define: {
    // In dev, default EPOCH so that the 3rd World Cup (edition 2) is starting now
    ...(!process.env.VITE_EPOCH && { 'import.meta.env.VITE_EPOCH': JSON.stringify(String(Date.now() - 2 * 10080 * 60 * 1000)) }),
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
      },
      manifest: false,
    }),
  ],
  test: {
    include: ['tests/**/*.test.js'],
  },
});
