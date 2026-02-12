import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['chokidar', 'electron']
            }
          }
        }
      }
      // preloadはビルドせず、直接CJSファイルを使用
    ])
  ],
  base: './',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
