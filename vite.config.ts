import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom domain (www.codevsme.com) serves from site root — use base '/'.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    strictPort: true,
  },
})
