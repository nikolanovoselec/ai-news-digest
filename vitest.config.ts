import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.toml' },
      miniflare: {
        compatibilityFlags: ['nodejs_compat']
      }
    })
  ],
  test: {
    include: ['tests/**/*.test.ts']
  }
});
