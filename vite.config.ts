import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // esbuild is faster and built-in
  },
  server: {
    port: 3000,
  },
});
