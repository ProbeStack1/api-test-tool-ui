import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 4173,
      strictPort: true,
      proxy: {
        '/api/v1/workspaces': {
          target: env.VITE_WORKSPACE_SERVICE_URL || 'http://localhost:8081',
          changeOrigin: true,
        },
        '/api/v1/collections': {
          target: env.VITE_COLLECTION_SERVICE_URL || 'http://localhost:8082',
          changeOrigin: true,
        },
      },
    },
  }
})
