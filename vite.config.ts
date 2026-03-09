import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // 'base: "./"' garante que o HTML procure os JS/CSS na mesma pasta,
  // essencial para hospedagens compartilhadas ou subdiretórios.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
