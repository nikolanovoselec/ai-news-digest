// Implements REQ-STAR-001 (regression-class gate)
//
// CI gate: NO Astro page or component may statically import a
// top-level `src/scripts/*.ts` file. Top-level scripts under
// `src/scripts/` are Pattern B (CSP-imposed self-contained IIFE
// bundles loaded layout-wide via `<script type="module" src="/scripts/
// <name>.js">`). When a page also imports the same module via
// Vite's bundler (Pattern A), the module is evaluated TWICE — once
// as the standalone IIFE and once as part of the page's hashed
// `_astro/*.js` chunk. Each evaluation has its own closure with its
// own listener-idempotency flag. Two listeners get registered on
// `document`. Star toggles fire POST + DELETE in parallel and the
// favourite UI silently reverts.
//
// This was the cause of the broken-favourites-on-/history bug that
// PRs #182, #184, and #185 all swung at and missed. Captured in
// AD20. This test fails the build if any page or component
// reintroduces the trap.
//
// Pages that genuinely need to share helper code with the standalone
// IIFE must move that code under `src/scripts/bundled/` so it's
// Pattern A only (NOT also exposed as a static IIFE bundle).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = new URL('../../', import.meta.url).pathname;

/** Recursively list every .astro file under a starting directory. */
function listAstroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listAstroFiles(full));
    } else if (entry.isFile() && extname(entry.name) === '.astro') {
      out.push(full);
    }
  }
  return out;
}

/** List the basenames of every Pattern B script (top-level src/scripts/*.ts).
 *  Excludes the bundled/ subdir which is Pattern A by convention. */
function patternBScriptNames(): string[] {
  const dir = join(REPO_ROOT, 'src/scripts');
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && extname(d.name) === '.ts')
    .map((d) => basename(d.name, '.ts'));
}

describe('Pattern B / Pattern A discipline (AD20)', () => {
  it('AD20: no src/pages/**/*.astro statically imports a Pattern B script', () => {
    const offenders: { file: string; importLine: string; script: string }[] =
      [];
    const scripts = patternBScriptNames();
    const pageDir = join(REPO_ROOT, 'src/pages');
    if (!statSync(pageDir).isDirectory()) {
      throw new Error('src/pages does not exist — did the project layout change?');
    }
    for (const file of listAstroFiles(pageDir)) {
      const src = readFileSync(file, 'utf-8');
      // Match `from '~/scripts/<name>'` or `from '../scripts/<name>'`.
      // Captures both single- and double-quoted forms.
      const importRegex =
        /from\s+['"](?:~\/scripts|\.{1,2}\/(?:\.{1,2}\/)*scripts)\/([a-zA-Z0-9_-]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(src)) !== null) {
        const name = match[1]!;
        if (scripts.includes(name)) {
          offenders.push({ file, importLine: match[0], script: name });
        }
      }
    }
    if (offenders.length > 0) {
      const report = offenders
        .map(
          (o) =>
            `  - ${o.file.replace(REPO_ROOT, '')} imports '${o.script}' (Pattern B)\n    → ${o.importLine}`,
        )
        .join('\n');
      throw new Error(
        `${offenders.length} page-level import(s) of a Pattern B script detected.\n` +
          `Top-level src/scripts/*.ts files are loaded via standalone <script src="/scripts/...">\n` +
          `tags layout-wide. Importing them from a page bundles the module a SECOND time, which\n` +
          `causes duplicate global event listeners and silently breaks favourites/star toggles.\n` +
          `See documentation/decisions/README.md AD20 for the full failure mode.\n` +
          `\n` +
          `Fix: move the imported helper to src/scripts/bundled/<name>.ts (Pattern A) and update\n` +
          `the page's import path. See AD20 for guidance.\n` +
          `\n` +
          `Offenders:\n${report}`,
      );
    }
    expect(offenders).toEqual([]);
  });

  it('AD20: no src/components/**/*.astro statically imports a Pattern B script', () => {
    const offenders: { file: string; importLine: string; script: string }[] =
      [];
    const scripts = patternBScriptNames();
    const componentDir = join(REPO_ROOT, 'src/components');
    if (!statSync(componentDir).isDirectory()) return; // optional folder
    for (const file of listAstroFiles(componentDir)) {
      const src = readFileSync(file, 'utf-8');
      const importRegex =
        /from\s+['"](?:~\/scripts|\.{1,2}\/(?:\.{1,2}\/)*scripts)\/([a-zA-Z0-9_-]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(src)) !== null) {
        const name = match[1]!;
        if (scripts.includes(name)) {
          offenders.push({ file, importLine: match[0], script: name });
        }
      }
    }
    if (offenders.length > 0) {
      const report = offenders
        .map(
          (o) =>
            `  - ${o.file.replace(REPO_ROOT, '')} imports '${o.script}' (Pattern B)\n    → ${o.importLine}`,
        )
        .join('\n');
      throw new Error(
        `${offenders.length} component-level import(s) of a Pattern B script detected.\n` +
          `Same failure mode as AD20 page-level case. Fix: move helper to src/scripts/bundled/.\n` +
          `\n` +
          `Offenders:\n${report}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
