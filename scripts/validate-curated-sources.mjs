#!/usr/bin/env node
// Implements REQ-PIPE-004 (live-fetch validator — dev only, not CI-gated)
//
// Probes every URL in src/lib/curated-sources.ts with a real fetch and
// prints a swap-list for feeds that 4xx/5xx or return empty bodies.
//
// Usage: node scripts/validate-curated-sources.mjs
//
// This is a disposable-grep script — it reads the TS file as text and
// pulls `feed_url` lines via regex so it has no dependency on the
// TypeScript toolchain. Accuracy is sufficient because the registry is
// a flat list of string literals with one feed_url per entry.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '..', 'src', 'lib', 'curated-sources.ts');

const TIMEOUT_MS = 10_000;
const CONCURRENCY = 8;

async function main() {
  const text = await readFile(REGISTRY_PATH, 'utf8');
  const entries = parseEntries(text);
  console.log(`Probing ${entries.length} curated sources...\n`);

  const failures = [];
  let cursor = 0;
  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push((async () => {
      while (true) {
        const i = cursor++;
        if (i >= entries.length) return;
        const entry = entries[i];
        const result = await probe(entry);
        if (result.ok) {
          console.log(`  ok   ${entry.slug.padEnd(28)} ${entry.feed_url}`);
        } else {
          console.log(`  FAIL ${entry.slug.padEnd(28)} ${entry.feed_url}  (${result.reason})`);
          failures.push({ ...entry, reason: result.reason });
        }
      }
    })());
  }
  await Promise.all(workers);

  console.log(`\n${entries.length - failures.length}/${entries.length} ok`);
  if (failures.length > 0) {
    console.log('\nSWAP-LIST (failing feeds):');
    for (const f of failures) {
      console.log(`  - ${f.slug}: ${f.feed_url}  (${f.reason})`);
    }
    process.exit(1);
  }
}

function parseEntries(text) {
  // Pull both slug and feed_url in source order. The registry uses
  // single-quoted string literals on the same line as the property name.
  const entries = [];
  const blockRegex = /\{[^}]*?slug:\s*'([^']+)'[^}]*?feed_url:\s*'([^']+)'[^}]*?\}/gs;
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    entries.push({ slug: match[1], feed_url: match[2] });
  }
  return entries;
}

async function probe(entry) {
  try {
    const response = await fetch(entry.feed_url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'news-digest-validator/1.0' },
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    const body = await response.text();
    if (body.length === 0) {
      return { ok: false, reason: 'empty body' };
    }
    const first = body.trimStart().charAt(0);
    if (first !== '<' && first !== '{') {
      return { ok: false, reason: `unexpected body prefix: ${first || 'empty'}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err?.message ?? err).slice(0, 120) };
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
