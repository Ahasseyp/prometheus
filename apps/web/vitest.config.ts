import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.js';

const isViteConfigFunction = typeof viteConfig === 'function';
const resolvedViteConfig = isViteConfigFunction
  ? await viteConfig({ command: 'serve', mode: 'test' })
  : viteConfig;

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  })
);
