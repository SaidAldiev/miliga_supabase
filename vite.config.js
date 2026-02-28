import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Vite config for a standalone Supabase-backed app.
// Base44 plugin removed.
export default defineConfig({
  logLevel: 'error',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react()],
});
