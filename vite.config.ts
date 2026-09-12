/// <reference types="node" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/',
  server: { host: true, port: Number(process.env.PORT) || 5173 },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.ts'] },
});
