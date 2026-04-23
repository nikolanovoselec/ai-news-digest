import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Vite plugin: resolve `?raw-css` imports as raw file contents.
 *
 * Vite's built-in `?raw` asset handler is intercepted by the CSS
 * transform pipeline for `.css` files, so `import x from 'foo.css?raw'`
 * lands in a test as an empty string. The `?raw-css` suffix below runs
 * with `enforce: 'pre'`, reads the file synchronously on the Node side
 * (before the workerd bundle is produced), and emits
 * `export default "<contents>"` — which is just a string by the time
 * the test pool boots.
 */
function rawCssPlugin(): Plugin {
  return {
    name: 'news-digest:raw-css',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith('?raw-css')) return null;
      const rel = source.slice(0, -'?raw-css'.length);
      if (importer === undefined) return null;
      const importerDir = fileURLToPath(new URL('.', `file://${importer}`));
      const absPath = new URL(rel, `file://${importerDir}`).pathname;
      return `${absPath}?raw-css`;
    },
    load(id) {
      if (!id.endsWith('?raw-css')) return null;
      const filePath = id.slice(0, -'?raw-css'.length);
      const contents = readFileSync(filePath, 'utf-8');
      return `export default ${JSON.stringify(contents)};`;
    }
  };
}

export default defineConfig({
  plugins: [
    rawCssPlugin(),
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.toml' },
      miniflare: {
        compatibilityFlags: ['nodejs_compat']
      }
    })
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Suppress structured-log noise from src/lib/log.ts during tests.
    // Real failures still print via vitest's own reporter.
    silent: true
  }
});
