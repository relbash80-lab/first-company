import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // Local development runs from /, while the production bundle targets GitHub Pages.
  base: command === 'serve' ? '/' : '/first-company/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@neondatabase') || id.includes('better-auth')) return 'neon-vendor';
          if (id.includes('react-icons')) return 'icons-vendor';
          if (id.includes('react-dom') || id.includes('react-router') || /node_modules[\\/]react[\\/]/.test(id)) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
}))
