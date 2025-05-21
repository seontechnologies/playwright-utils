import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    server: {
      port: Number(env.VITE_PORT),
      host: true
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@playwright': path.resolve(__dirname, '../../playwright'),
        '@shared': path.resolve(__dirname, '../../sample-app/shared'),
        '@vitest-utils': path.resolve(
          __dirname,
          './src/test-utils/vitest-utils'
        )
      }
    },
    // Vite 6 changes the way environment variables are handled
    define: {
      'process.env': {}
    }
  }
})
