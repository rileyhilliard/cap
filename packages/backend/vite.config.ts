import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import path from 'path';
import excludeDependenciesFromBundle from 'rollup-plugin-exclude-dependencies-from-bundle';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    server: {
      port: 4000,
    },
    plugins: [
      ...VitePluginNode({
        adapter: 'express',
        appPath: isDev ? './src/server.dev.ts' : './src/server.prod.ts',
        exportName: 'app',
      }),
      excludeDependenciesFromBundle({
        peerDependencies: false,
        exclude: ['**/*.test.ts']
      }),
    ],
    resolve: {
      alias: {
        '@backend': path.resolve(__dirname, './src'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@domains': path.resolve(__dirname, './src/domains'),
        '@types': path.resolve(__dirname, './src/types'),
      },
    },
    esbuild: {
      target: 'esnext',
      sourcemap: true,
      format: 'cjs'
    },
    // build: {
    //   rollupOptions: {
    //     plugins: [resolve()],
    //     output: {
    //       format: 'cjs', // Use CommonJS format for the output
    //     },
    //   },
    // },
  };
});
