import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Define module entry points that should be built separately
        moduleLoader: resolve(__dirname, 'src/modules/moduleLoader.ts'),
      },
      output: {
        // Keep modules as separate chunks
        manualChunks: {
          // Core vendor dependencies
          vendor: ['preact', 'preact/hooks'],
          // Shared utilities
          utils: ['src/utils/common'],
          // Keep CSS modules separate
          styles: ['src/assets/styles/variables.css'],
        },
        // Configure dynamic imports
        chunkFileNames: (chunkInfo) => {
          // Keep module files in their own directory
          if (chunkInfo.name?.includes('module-')) {
            return 'modules/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        // Ensure assets are placed in predictable locations
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Enable module system features
    modulePreload: true,
    target: 'esnext',
    sourcemap: true,
  }
})
