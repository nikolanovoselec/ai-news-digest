// Re-export the subset of `cloudflare:test` that our integration tests
// actually use, stripping the `@deprecated` JSDoc tag the upstream type
// definition carries on `env`. That tag is informational — the binding
// is still the supported entry point for integration tests against the
// workerd pool — but it generates ~90 `ts(6385) 'env' is deprecated`
// warnings across the test suite that drown every real CI failure in
// noise.
//
// Re-exporting through a local typed alias localizes the noise to this
// one file (suppressed below) and leaves test files importing clean,
// non-deprecated symbols.
//
// If the upstream package removes the deprecation tag in a future
// release, delete this file and revert the test-side imports to the
// direct `cloudflare:test` path.

// eslint-disable-next-line @typescript-eslint/no-deprecated
import * as cftest from 'cloudflare:test';

/** D1-backed env with project bindings, matching the miniflare
 *  configuration in wrangler.test.toml + vitest.config.ts. */
export const env = cftest.env as Cloudflare.Env & {
  DB_MIGRATIONS?: unknown;
};

export const applyD1Migrations = cftest.applyD1Migrations;
