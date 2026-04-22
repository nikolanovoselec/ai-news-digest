// Tests for src/lib/discovery.ts#validateFeedUrl — REQ-DISC-001.
//
// The validator is pure pipeline code: every gate must hold for the
// URL to pass. These tests exercise each gate independently:
//   - SSRF filter (rejects private IPs, non-https)
//   - HTTP status code (rejects 4xx/5xx)
//   - Content-Type (rejects mismatch per kind)
//   - Parseability (rejects malformed XML / JSON)
//   - Item presence (rejects empty feeds)
//   - Accepts a well-formed feed of each kind.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFeedUrl } from '~/lib/discovery';

function mockFetch(
  opts: {
    status?: number;
    contentType?: string;
    body?: string;
    throws?: Error;
  } = {},
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation(async () => {
    if (opts.throws !== undefined) throw opts.throws;
    return new Response(opts.body ?? '', {
      status: opts.status ?? 200,
      headers: { 'Content-Type': opts.contentType ?? 'application/rss+xml' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function rssWithItems(): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Ex</title>
    <item><title>One</title><link>https://ex.com/1</link></item>
    <item><title>Two</title><link>https://ex.com/2</link></item>
  </channel></rss>`;
}

function rssEmpty(): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Ex</title></channel></rss>`;
}

function atomWithEntries(): string {
  return `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <title>Ex</title>
    <entry><title>One</title><link href="https://ex.com/1"/></entry>
  </feed>`;
}

function atomEmpty(): string {
  return `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <title>Ex</title>
  </feed>`;
}

function jsonFeedWithItems(): string {
  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    items: [{ title: 'One', url: 'https://ex.com/1' }],
  });
}

function jsonFeedEmpty(): string {
  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    items: [],
  });
}

describe('validateFeedUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('SSRF gate', () => {
    it('REQ-DISC-001: rejects http:// URLs without network call', async () => {
      const fetchMock = mockFetch({ body: rssWithItems() });
      const ok = await validateFeedUrl('http://ex.com/feed', 'rss');
      expect(ok).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('REQ-DISC-001: rejects private IP without network call', async () => {
      const fetchMock = mockFetch({ body: rssWithItems() });
      const ok = await validateFeedUrl('https://192.168.1.1/feed', 'rss');
      expect(ok).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('HTTP status gate', () => {
    it('REQ-DISC-001: rejects 404 response', async () => {
      mockFetch({ status: 404, body: '' });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: rejects 500 response', async () => {
      mockFetch({ status: 500, body: rssWithItems() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: rejects when fetch throws (timeout, DNS, etc.)', async () => {
      mockFetch({ throws: new Error('timeout') });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(false);
    });
  });

  describe('Content-Type gate', () => {
    it('REQ-DISC-001: rejects text/html when kind=rss', async () => {
      mockFetch({ contentType: 'text/html', body: rssWithItems() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: rejects text/plain when kind=json', async () => {
      mockFetch({ contentType: 'text/plain', body: jsonFeedWithItems() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'json');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: accepts application/xml for rss', async () => {
      mockFetch({ contentType: 'application/xml; charset=utf-8', body: rssWithItems() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(true);
    });

    it('REQ-DISC-001: accepts text/xml for atom', async () => {
      mockFetch({ contentType: 'text/xml', body: atomWithEntries() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'atom');
      expect(ok).toBe(true);
    });
  });

  describe('parse gate', () => {
    it('REQ-DISC-001: rejects malformed JSON when kind=json', async () => {
      mockFetch({ contentType: 'application/json', body: '{not-json' });
      const ok = await validateFeedUrl('https://ex.com/feed', 'json');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: rejects HTML masquerading as XML body', async () => {
      mockFetch({
        contentType: 'application/rss+xml',
        body: '<html><body>not a feed</body></html>',
      });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(false);
    });
  });

  describe('item-presence gate', () => {
    it('REQ-DISC-001: rejects empty RSS (0 items)', async () => {
      mockFetch({ contentType: 'application/rss+xml', body: rssEmpty() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: rejects empty Atom (0 entries)', async () => {
      mockFetch({ contentType: 'application/atom+xml', body: atomEmpty() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'atom');
      expect(ok).toBe(false);
    });

    it('REQ-DISC-001: rejects empty JSON feed (0 items)', async () => {
      mockFetch({ contentType: 'application/json', body: jsonFeedEmpty() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'json');
      expect(ok).toBe(false);
    });
  });

  describe('happy path', () => {
    it('REQ-DISC-001: accepts 200 + rss body with items', async () => {
      mockFetch({ contentType: 'application/rss+xml', body: rssWithItems() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'rss');
      expect(ok).toBe(true);
    });

    it('REQ-DISC-001: accepts 200 + atom body with entries', async () => {
      mockFetch({ contentType: 'application/atom+xml', body: atomWithEntries() });
      const ok = await validateFeedUrl('https://ex.com/feed', 'atom');
      expect(ok).toBe(true);
    });

    it('REQ-DISC-001: accepts 200 + json feed body with items', async () => {
      mockFetch({ contentType: 'application/feed+json', body: jsonFeedWithItems() });
      const ok = await validateFeedUrl('https://ex.com/feed.json', 'json');
      expect(ok).toBe(true);
    });
  });
});
