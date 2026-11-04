// 
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.PORT || 5001;
const backendUrl = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendUrl,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
