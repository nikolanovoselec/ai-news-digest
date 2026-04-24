// Tests for the settings.astro Re-discover button — REQ-DISC-004 AC 1.
//
// The button renders only for user tags whose `sources:{tag}` KV entry
// has an empty `feeds` array. A brand-new tag (no KV entry yet) must
// NOT surface the button — the entry-not-written case is "discovery
// still pending", not "stuck". The button posts a native HTML form
// to /api/discovery/retry so the endpoint's form-POST branch drives it.

import { describe, it, expect } from 'vitest';
import settingsPage from '../../src/pages/settings.astro?raw';

describe('settings.astro Re-discover button — REQ-DISC-004', () => {
  it('REQ-DISC-004: settings.astro computes emptyFeedTags by reading sources:{tag} entries', () => {
    // The file must batch-read the `sources:{tag}` KV entry for each
    // user tag and push tags whose parsed value has `feeds.length === 0`.
    expect(settingsPage).toContain('emptyFeedTags');
    expect(settingsPage).toContain('sources:${tag}');
    // Parse gate: feeds must be explicitly array-empty (not undefined).
    expect(settingsPage).toMatch(/Array\.isArray\(feeds\)[\s\S]*?feeds\.length === 0/);
  });

  it('REQ-DISC-004: the Re-discover fieldset renders only when emptyFeedTags.length > 0', () => {
    // Regression guard against accidentally always-rendering the Stuck
    // Tags section for users with no stuck tags.
    expect(settingsPage).toMatch(/emptyFeedTags\.length > 0[\s\S]*?Stuck tags/);
  });

  it('REQ-DISC-004: each stuck-tag form posts to /api/discovery/retry with a hidden tag field', () => {
    expect(settingsPage).toContain('action="/api/discovery/retry"');
    expect(settingsPage).toMatch(/method="post"[\s\S]*?action="\/api\/discovery\/retry"/);
    expect(settingsPage).toMatch(/<input\s+type="hidden"\s+name="tag"\s+value=\{tag\}\s*\/>/);
  });

  it('REQ-DISC-004: the button label includes the tag with a hash prefix', () => {
    // Button label "Re-discover #<tag>" gives the user an unambiguous
    // hint about which tag they're triggering.
    expect(settingsPage).toContain('Re-discover #{tag}');
  });

  it('REQ-DISC-004: a rediscover=ok query param surfaces a confirmation banner', () => {
    expect(settingsPage).toContain('rediscoverConfirmedTag');
    expect(settingsPage).toContain("'rediscover'");
    expect(settingsPage).toMatch(/rediscoverConfirmedTag !== null/);
  });

  it("REQ-DISC-004: settings.astro annotates itself with the REQ id", () => {
    // Spec-reviewer greps for the annotation to link code → REQ.
    expect(settingsPage).toContain('REQ-DISC-004');
  });
});
