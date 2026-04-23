// Tests for src/lib/curated-sources.ts — REQ-PIPE-004.
//
// The registry is the pipeline's single source of what to fetch every
// hour. These invariants guard against silent drift:
//   - size floor so we keep candidate pool diversity
//   - tag coverage so every default hashtag returns at least some news
//   - feed_url / kind shape so the coordinator's parser-dispatch never
//     sees a surprise value
//   - unique slugs so cache keys and log fields stay collision-free

import { describe, it, expect } from 'vitest';
import { CURATED_SOURCES } from '~/lib/curated-sources';
import { DEFAULT_HASHTAGS } from '~/lib/default-hashtags';

describe('curated-sources — REQ-PIPE-004', () => {
  it('REQ-PIPE-004: registry has ≥50 entries', () => {
    expect(CURATED_SOURCES.length).toBeGreaterThanOrEqual(50);
  });

  it('REQ-PIPE-004: every DEFAULT_HASHTAGS tag has ≥1 source', () => {
    // Build a set of every tag that appears in any source's tags array,
    // then verify each default hashtag is a member. Any missing tag is
    // reported by name so the failure message is actionable.
    const covered = new Set<string>();
    for (const source of CURATED_SOURCES) {
      for (const tag of source.tags) {
        covered.add(tag);
      }
    }
    const missing = DEFAULT_HASHTAGS.filter((t) => !covered.has(t));
    expect(missing).toEqual([]);
  });

  it('REQ-PIPE-004: every source has ≥1 tag', () => {
    for (const source of CURATED_SOURCES) {
      expect(source.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('REQ-PIPE-004: every feed_url is https', () => {
    for (const source of CURATED_SOURCES) {
      expect(source.feed_url.startsWith('https://')).toBe(true);
    }
  });

  it('REQ-PIPE-004: every kind is rss|atom|json', () => {
    const allowed = new Set(['rss', 'atom', 'json']);
    for (const source of CURATED_SOURCES) {
      expect(allowed.has(source.kind)).toBe(true);
    }
  });

  it('REQ-PIPE-004: every slug is unique', () => {
    const slugs = CURATED_SOURCES.map((s) => s.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('REQ-PIPE-004: every slug is lowercase-kebab', () => {
    const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const source of CURATED_SOURCES) {
      expect(source.slug).toMatch(slugPattern);
    }
  });

  it('REQ-PIPE-004: every name is a non-empty trimmed string', () => {
    for (const source of CURATED_SOURCES) {
      expect(source.name.length).toBeGreaterThan(0);
      expect(source.name).toBe(source.name.trim());
    }
  });
});
