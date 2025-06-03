import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: [
      '1603b35d-c9e2-4be0-948c-441ea7236241-00-2e5pbphjgx4w5.picard.replit.dev',
      'localhost',
      '.replit.dev'
    ]
  }
})
