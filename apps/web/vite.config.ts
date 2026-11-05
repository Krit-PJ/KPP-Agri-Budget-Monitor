import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// GitHub Pages project site: https://<user>.github.io/KPP-Agri-Budget-Monitor/
// CSP ใส่เฉพาะตอน build (dev server ของ Vite ใช้ inline script)
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://script.google.com https://script.googleusercontent.com; " +
  "base-uri 'self'; form-action 'none'; object-src 'none'";

export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [
    react(),
    {
      name: 'kpp-csp',
      apply: 'build',
      transformIndexHtml: (html) => html.replace('<meta name="referrer"', `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer"`),
    },
  ],
  resolve: {
    alias: {
      '@kpp/domain': fileURLToPath(new URL('../../packages/domain/src/index.ts', import.meta.url)),
      '@kpp/gas': fileURLToPath(new URL('../gas/src', import.meta.url)),
    },
  },
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 900 },
});
