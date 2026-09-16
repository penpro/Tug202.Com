import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api/* is proxied to the Express backend so the forms work
// locally without CORS. In production nginx does the same job.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3202'
    }
  }
})
