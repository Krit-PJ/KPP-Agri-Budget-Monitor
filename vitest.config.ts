import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@kpp/domain': fileURLToPath(new URL('./packages/domain/src/index.ts', import.meta.url)) } },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/gas/test/**/*.test.ts', 'apps/web/src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
