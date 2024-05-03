import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import path from 'path';

export default defineConfig({
  server: {
    port: 4000,
  },
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './src/server-dev.ts',
      exportName: 'app',
    }),
  ],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@domains': path.resolve(__dirname, './src/domains')
    },
  },
});