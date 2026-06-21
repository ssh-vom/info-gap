// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

// https://astro.build/config
// Static by default; DB-backed pages opt into SSR with `export const prerender = false`.
export default defineConfig({
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // local D1/KV (miniflare) writes its sqlite WAL here on every query; without this,
    // each SSR read triggers a full-page reload and nukes whatever you're typing.
    server: { watch: { ignored: ['**/.wrangler/**', '**/dist/**'] } },
    // Excalidraw pulls CJS deps (es6-promise-pool) and code-splits internally; force Vite
    // to pre-bundle it so the CJS->ESM interop + lazy sub-chunks resolve in one clean pass.
    // tiptap-markdown pulls markdown-it (CJS); pre-bundle the editor stack so the
    // CJS->ESM interop resolves cleanly, same reason as Excalidraw.
    optimizeDeps: { include: ['@excalidraw/excalidraw', 'tiptap-markdown', 'markdown-it'] }
  }
});