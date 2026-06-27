import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.firefox.json'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
    cors: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
})
