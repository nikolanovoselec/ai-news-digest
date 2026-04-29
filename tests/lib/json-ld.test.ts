// Tests for src/lib/json-ld.ts (REQ-OPS-004) — pin the </script>
// early-close defence so a future regex narrowing doesn't silently
// regress it.

import { describe, it, expect } from 'vitest';
import { safeJsonLd } from '~/lib/json-ld';

describe('safeJsonLd', () => {
  it('REQ-OPS-004: byte-equivalent to JSON.stringify for simple values', () => {
    const graph = { '@type': 'WebSite', name: 'News Digest' };
    expect(safeJsonLd(graph)).toBe(JSON.stringify(graph));
  });

  it('REQ-OPS-004: escapes lowercase </script> sequences', () => {
    const out = safeJsonLd({ description: 'foo </script> bar' });
    expect(out).not.toMatch(/<\/script>/);
    expect(out).toMatch(/<\\\/script>/);
  });

  it('REQ-OPS-004: escapes uppercase </SCRIPT> sequences (case-insensitive)', () => {
    const out = safeJsonLd({ description: 'foo </SCRIPT> bar' });
    expect(out).not.toMatch(/<\/SCRIPT>/);
    expect(out).toMatch(/<\\\/SCRIPT>/);
  });

  it('REQ-OPS-004: U+2028 / U+2029 are escaped by JSON.stringify natively (ES2019)', () => {
    // The helper relies on JSON.stringify to handle these per ES2019.
    // If a future engine drift removes that, the assertion catches it.
    const out = safeJsonLd({ note: '  ' });
    expect(out).not.toContain(' ');
    expect(out).not.toContain(' ');
    expect(out).toMatch(/\\u2028/);
    expect(out).toMatch(/\\u2029/);
  });
});
