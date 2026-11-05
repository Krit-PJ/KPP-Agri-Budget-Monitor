import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({ entryPoints: ['scripts/gen-docs.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'node_modules/.cache/gen-docs.mjs',
  alias: { '@kpp/domain': fileURLToPath(new URL('../packages/domain/src/index.ts', import.meta.url)) }, logLevel: 'warning' });
await import('../node_modules/.cache/gen-docs.mjs');
