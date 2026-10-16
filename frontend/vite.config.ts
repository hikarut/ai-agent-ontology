import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // /api へのリクエストをバックエンド(FastAPI)に転送する
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
