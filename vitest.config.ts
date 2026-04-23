import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { fileURLToPath } from 'node:url';

// Read the D1 migration SQL at config-load time so integration tests
// (schema-0003.test.ts, cleanup.test.ts) can call applyD1Migrations
// with a real migrations array instead of the empty list.
const migrations = await readD1Migrations(
  fileURLToPath(new URL('./migrations', import.meta.url)),
);

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.toml' },
      miniflare: {
        compatibilityFlags: ['nodejs_compat'],
        bindings: {
          DB_MIGRATIONS: migrations
        }
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
