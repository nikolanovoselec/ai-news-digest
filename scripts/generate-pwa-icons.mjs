#!/usr/bin/env node
// Implements REQ-PWA-001
//
// Render the PWA app icon SVG to PNG at the sizes Samsung Internet and
// older Android Chrome require for the "Install app" install dialog.
// Some browsers refuse the install prompt when the manifest only ships
// SVG icons; pinning a 192×192 + 512×512 raster pair restores the
// install affordance without losing the SVG vector lane.
//
// Runs as a build step (see `build` in package.json) so the generated
// PNGs land in `dist/` and ship to the static-asset bundle. The PNGs
// are NOT committed — they are reproducible from the SVG.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const iconsDir = join(repoRoot, 'public', 'icons');
const svgPath = join(iconsDir, 'app-icon.svg');

const svgRaw = readFileSync(svgPath, 'utf-8');

// Strip the prefers-color-scheme: light override so the static PNG
// always uses the dark palette (#0a0a0a bg, #fafafa fg). The launcher
// composites the icon over its own canvas; a dark icon reads cleanly
// on every Android launcher tested. resvg ignores @media queries by
// default — the strip is a belt-and-braces guard against future
// resvg releases that might evaluate them.
const svgFlat = svgRaw.replace(
  /@media\s*\(\s*prefers-color-scheme:\s*light\s*\)\s*\{[^}]*\{[^}]*\}[^}]*\{[^}]*\}\s*\}/g,
  '',
);

const sizes = [192, 512];
mkdirSync(iconsDir, { recursive: true });

for (const size of sizes) {
  const resvg = new Resvg(svgFlat, {
    fitTo: { mode: 'width', value: size },
    background: '#0a0a0a',
  });
  const png = resvg.render().asPng();
  const outPath = join(iconsDir, `app-icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`[pwa-icons] wrote ${outPath} (${png.length} bytes, ${size}×${size})`);
}
