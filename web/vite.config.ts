import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import path from 'path';

const localOctahedron = path.resolve(__dirname, '../../octahedron/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // In local dev, alias to source for HMR. In CI/Docker, use npm dist (no alias).
      ...(existsSync(localOctahedron) ? { octahedron: localOctahedron } : {}),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
