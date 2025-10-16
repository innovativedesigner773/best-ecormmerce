
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['clsx', 'tailwind-merge'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          charts: ['recharts', 'd3'],
          forms: ['react-hook-form', 'zod'],
          motion: ['framer-motion']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    modulePreload: false
  },
  server: {
    port: 3000,
    open: true,
  },
});