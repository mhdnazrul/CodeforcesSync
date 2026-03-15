import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
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
