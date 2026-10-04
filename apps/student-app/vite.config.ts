import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nammabus/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@nammabus/ui-components': path.resolve(__dirname, '../../packages/ui-components/src'),
      '@nammabus/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
    },
  },
  server: {
    port: 3001,
  },
});
