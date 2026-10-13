// Deployment isolation contract: the generated entry config must retain the
// selected source environment's identity, protected resources and cron policy.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { unstable_readConfig } from 'wrangler';

const source = unstable_readConfig({
  config: 'wrangler.toml',
  ...(process.env.CLOUDFLARE_ENV ? { env: process.env.CLOUDFLARE_ENV } : {}),
}, { useRedirectIfAvailable: false, hideWarnings: true });
const redirectFile = path.resolve('.wrangler/deploy/config.json');
const redirect = JSON.parse(await readFile(redirectFile, 'utf8'));
const configPath = path.resolve(path.dirname(redirectFile), redirect.configPath);
const relativePath = path.relative(path.resolve('dist'), configPath);
assert(!relativePath.startsWith('..') && !path.isAbsolute(relativePath),
  'Generated deployment configuration must be inside dist');
const built = JSON.parse(await readFile(configPath, 'utf8'));

assert.equal(built.name, source.name, 'Built Worker name must match selected environment');
assert.equal(built.vars?.IS_PRODUCTION, source.vars.IS_PRODUCTION,
  'Built production guard must match selected environment');
assert.equal(built.workers_dev, false, 'Built Worker must not expose workers.dev');
assert.equal(built.assets?.binding, source.assets.binding, 'Built assets binding must match');

const bindings = (values, fields) => (values ?? []).map((value) =>
  fields.map((field) => value[field])).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
for (const [key, fields] of [
  ['d1_databases', ['binding', 'database_id']],
  ['kv_namespaces', ['binding', 'id']],
  ['vectorize', ['binding', 'index_name']],
]) {
  assert.deepEqual(bindings(built[key], fields), bindings(source[key], fields),
    `Built ${key} must match selected environment`);
}
assert.deepEqual(bindings(built.queues?.producers, ['binding', 'queue']),
  bindings(source.queues.producers, ['binding', 'queue']),
  'Built queue producers must match selected environment');
assert.deepEqual(bindings(built.queues?.consumers, ['queue']),
  bindings(source.queues.consumers, ['queue']),
  'Built queue consumers must match selected environment');
assert.deepEqual(built.triggers?.crons ?? [], source.triggers.crons,
  'Built cron policy must match selected environment');
console.log(`Validated built deployment target: ${built.name}`);
