// Tests for public/manifest.webmanifest — REQ-PWA-001.
// The manifest is the PWA install contract: name, icons, start_url, display,
// theme/background colors. This test asserts the shape so a future refactor
// can't silently drop required fields.

import { describe, it, expect } from 'vitest';
import manifestSource from '../../public/manifest.webmanifest?raw';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface WebManifest {
  name?: string;
  short_name?: string;
  description?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  theme_color?: string;
  background_color?: string;
  icons?: ManifestIcon[];
}

const manifest = JSON.parse(manifestSource) as WebManifest;

describe('manifest.webmanifest', () => {
  it('REQ-PWA-001: parses as valid JSON', () => {
    expect(manifest).toBeTypeOf('object');
    expect(manifest).not.toBeNull();
  });

  it('REQ-PWA-001: declares required string fields per AC 1', () => {
    expect(manifest.name).toBe('News Digest');
    expect(manifest.short_name).toBe('Digest');
    expect(typeof manifest.description).toBe('string');
    expect(manifest.description?.length).toBeGreaterThan(0);
    expect(manifest.start_url).toBe('/digest');
    expect(manifest.display).toBe('standalone');
  });

  it('REQ-PWA-001: declares theme_color and background_color as hex strings', () => {
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(manifest.theme_color).toBe('#ffffff');
    expect(manifest.background_color).toBe('#ffffff');
  });

  it('REQ-PWA-001: includes a 192x192 PNG icon (AC 2)', () => {
    const icon = manifest.icons?.find((i) => i.sizes === '192x192');
    expect(icon, 'manifest must ship a 192x192 icon').toBeDefined();
    expect(icon?.type).toBe('image/png');
    expect(icon?.src).toMatch(/\.png$/);
  });

  it('REQ-PWA-001: includes a 512x512 PNG icon (AC 2)', () => {
    const icon = manifest.icons?.find(
      (i) => i.sizes === '512x512' && (i.purpose ?? 'any') === 'any'
    );
    expect(icon, 'manifest must ship a 512x512 any-purpose icon').toBeDefined();
    expect(icon?.type).toBe('image/png');
  });

  it('REQ-PWA-001: includes a 512x512 maskable PNG icon (AC 2)', () => {
    const maskable = manifest.icons?.find(
      (i) => i.sizes === '512x512' && i.purpose === 'maskable'
    );
    expect(maskable, 'manifest must ship a 512x512 maskable icon').toBeDefined();
    expect(maskable?.type).toBe('image/png');
  });

  it('REQ-PWA-001: every icon has a src starting with / and ending in .png', () => {
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons!.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons!) {
      expect(icon.src.startsWith('/')).toBe(true);
      expect(icon.src.endsWith('.png')).toBe(true);
    }
  });
});
