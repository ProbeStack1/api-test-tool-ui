/**
 * Vite configuration.
 * What: Dev server + build config for ForgeQ UI.
 * Why : Centralizes path aliases, tailwind plugin, and react plugin.
 * Usage: `yarn dev` (local), `yarn build` (prod static bundle).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Lottie-web is a peer dep of @lordicon/react; Vite's pre-bundler needs
    // an explicit hint because the package is imported from inside another
    // node_module (not from our src).
    include: ['lottie-web', '@lordicon/react', '@lordicon/helpers'],
    // Monaco's web workers are imported via `?worker` and must NOT be
    // optimized — Vite handles them as separate worker bundles.
    exclude: [
      'monaco-editor/esm/vs/editor/editor.worker',
      'monaco-editor/esm/vs/language/json/json.worker',
      'monaco-editor/esm/vs/language/css/css.worker',
      'monaco-editor/esm/vs/language/html/html.worker',
      'monaco-editor/esm/vs/language/typescript/ts.worker',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/a2a-proxy': {
        target: 'https://a2aregistry.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/a2a-proxy/, '/api/agents'),
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Manual chunks to keep vendor bundles lean and cacheable.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@monaco-editor/react', 'monaco-editor'],
          charts: ['recharts'],
        },
      },
    },
  },
});
