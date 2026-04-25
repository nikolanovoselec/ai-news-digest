// Tests for src/lib/default-hashtags.ts — REQ-AUTH-001 (20-entry seed for new
// accounts in the global-feed rework) and REQ-SET-002 (default hashtag seed).
import { describe, it, expect } from 'vitest';
import { DEFAULT_HASHTAGS } from '~/lib/default-hashtags';

const ORIGINAL_TWELVE = [
  'cloudflare',
  'ai',
  'mcp',
  'agenticai',
  'genai',
  'aws',
  'cloud',
  'serverless',
  // 'workers' was renamed to 'cloudflareworkers' on 2026-04-25 because
  // the bare 'workers' tag surfaced articles about people working
  // (HR / labour stories) instead of Cloudflare Workers technology.
  'cloudflareworkers',
  'azure',
  'zero-trust',
  'microsegmentation',
] as const;

const NEW_EIGHT = [
  'kubernetes',
  'terraform',
  'devsecops',
  'observability',
  'rust',
  'python',
  'postgres',
  'threat-intel',
] as const;

describe('default-hashtags — REQ-AUTH-001', () => {
  it('REQ-AUTH-001: DEFAULT_HASHTAGS has exactly 20 entries', () => {
    expect(DEFAULT_HASHTAGS).toHaveLength(20);
  });

  it('REQ-AUTH-001: includes all 12 original entries', () => {
    for (const tag of ORIGINAL_TWELVE) {
      expect(DEFAULT_HASHTAGS).toContain(tag);
    }
  });

  it('REQ-AUTH-001: includes the 8 new entries', () => {
    for (const tag of NEW_EIGHT) {
      expect(DEFAULT_HASHTAGS).toContain(tag);
    }
  });

  it('REQ-AUTH-001: every entry is a valid tag slug (lowercase, alphanumeric + hyphen)', () => {
    const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const tag of DEFAULT_HASHTAGS) {
      expect(tag).toMatch(validSlug);
    }
  });

  it('REQ-AUTH-001: no duplicates', () => {
    const unique = new Set(DEFAULT_HASHTAGS);
    expect(unique.size).toBe(DEFAULT_HASHTAGS.length);
  });
});
