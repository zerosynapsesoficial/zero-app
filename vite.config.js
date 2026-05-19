import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    open: 'opera',
    proxy: {
      '/api/supabase': {
        target: 'https://oryguljbqcphbtiapvwk.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, '')
      }
    }
  }
})
