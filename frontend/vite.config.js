import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('socket.io-client')) return 'socketio';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  server: {
    // In local dev, proxy Socket.IO + API calls to the backend
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/audio': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}));
