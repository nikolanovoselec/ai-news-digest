// Regression test: when an RSS item carries a `<source>` element,
// the headline's source_name uses the per-item publisher rather than
// the feed-level adapter name. This is critical for Google News
// auto-synth feeds (REQ-PIPE-001 AC 9) where the feed-level name is
// "Google News: <tag>" — without the per-item override, every article
// from the GN feed would carry the same generic label and the
// alt-source picker on the article-detail page would show two rows
// labelled identically that link to different publishers.

import { describe, it, expect } from 'vitest';
import { adaptersForDiscoveredFeeds } from '~/lib/sources';

function extractorFor(
  name: string,
  url: string,
  kind: 'rss' | 'json' = 'rss',
) {
  const adapters = adaptersForDiscoveredFeeds(
    [{ name, url, kind }],
    { trusted: true },
  );
  const a = adapters[0];
  if (a === undefined) throw new Error(`adapter not built for ${name}`);
  return a.extract;
}

function gnExtractor() {
  return extractorFor('Google News: mcp', 'https://news.google.com/rss/search?q=mcp');
}

describe('RSS per-item <source> override', () => {
  const extract = gnExtractor();

  it('uses per-item <source> publisher when fxp emits a string', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'One in four MCP servers expose code execution risk',
            link: 'https://news.google.com/articles/CCAi-helpnetsec',
            pubDate: 'Mon, 05 May 2026 04:30:00 GMT',
            // fxp without attribute-aware parsing emits a bare string.
            source: 'Help Net Security',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head).toBeDefined();
    expect(head?.source_name).toBe('Help Net Security');
  });

  it('uses per-item <source> publisher when fxp emits an object with #text + url attribute', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Security audit finds RCE risks in 6.2% of MCP servers',
            link: 'https://news.google.com/articles/CCAi-hackernoon',
            pubDate: 'Mon, 05 May 2026 04:30:00 GMT',
            source: { '#text': 'HackerNoon', url: 'https://hackernoon.com/' },
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.source_name).toBe('HackerNoon');
  });

  it('falls back to the feed-level adapter name when <source> is absent', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'A feed without per-item source',
            link: 'https://example.com/no-source',
            pubDate: 'Mon, 05 May 2026 04:30:00 GMT',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.source_name).toBe('Google News: mcp');
  });

  it('falls back to feed-level name when <source> is empty string', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Empty source',
            link: 'https://example.com/empty-src',
            pubDate: 'Mon, 05 May 2026 04:30:00 GMT',
            source: '   ',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.source_name).toBe('Google News: mcp');
  });

  it('REQ-PIPE-010: ignores Hacker News outbound-feed descriptions so linked pages are fetched before summarization', () => {
    const extract = extractorFor('Hacker News - Show HN', 'https://hnrss.org/show');
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Show HN: AI Briefs',
            link: 'https://aibriefs.news',
            pubDate: 'Mon, 09 Jun 2025 20:16:21 GMT',
            description:
              'I decided to build my own AI feeds reader since I wanted features I could not find. Comments URL: https://news.ycombinator.com/item?id=48466773 Points: 2 # Comments: 0',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://aibriefs.news');
    expect(head?.source_name).toBe('Hacker News - Show HN');
    expect(head?.force_body_fetch).toBe(true);
    expect(head).not.toHaveProperty('snippet');
  });

  it('REQ-PIPE-010: ignores generic cross-site aggregator metadata, not just Hacker News', () => {
    const extract = extractorFor(
      'Example Aggregator',
      'https://aggregator.example/rss',
    );
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Startup launches a useful security scanner',
            link: 'https://publisher.example/security-scanner',
            pubDate: 'Mon, 09 Jun 2025 20:16:21 GMT',
            description:
              'A community member submitted this story. Discussion URL: https://aggregator.example/item/123 Score: 42 Comments: 17',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://publisher.example/security-scanner');
    expect(head?.force_body_fetch).toBe(true);
    expect(head).not.toHaveProperty('snippet');
  });

  it('REQ-PIPE-010: falls back to later article excerpts after dropping aggregator metadata', () => {
    const extract = extractorFor(
      'Example Aggregator',
      'https://aggregator.example/rss',
    );
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Startup launches a useful security scanner',
            link: 'https://publisher.example/security-scanner',
            pubDate: 'Mon, 09 Jun 2025 20:16:21 GMT',
            'content:encoded':
              'Discussion URL: https://aggregator.example/item/123 Score: 42 Comments: 17',
            description:
              'The security scanner analyzes hosted model endpoints for exposed credentials and produces a concise remediation report for engineering teams.',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://publisher.example/security-scanner');
    expect(head?.force_body_fetch).toBe(true);
    expect(head?.snippet).toContain('security scanner analyzes');
  });

  it('REQ-PIPE-010: ignores cross-site aggregator metadata in JSON Feed items too', () => {
    const extract = extractorFor(
      'JSON Aggregator',
      'https://json-aggregator.example/feed.json',
      'json',
    );
    const parsed = {
      items: [
        {
          title: 'Research team publishes an AI benchmark',
          url: 'https://json-aggregator.example/item/456',
          external_url: 'https://publisher.example/ai-benchmark',
          date_published: '2025-06-09T20:16:21Z',
          summary:
            'Posted by community-user. Discussion URL: https://json-aggregator.example/item/456 Score: 21 Comments: 9',
        },
      ],
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://publisher.example/ai-benchmark');
    expect(head?.force_body_fetch).toBe(true);
    expect(head).not.toHaveProperty('snippet');
  });

  it('REQ-PIPE-010: keeps cross-host publisher-feed-service summaries when they are article excerpts', () => {
    const extract = extractorFor(
      'Example Publisher',
      'https://feeds.example-cdn.com/publisher.xml',
    );
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Publisher story',
            link: 'https://example.com/story',
            pubDate: 'Mon, 09 Jun 2025 20:16:21 GMT',
            description:
              'This publisher-owned feed description is a legitimate article excerpt that should remain available to the summarizer before any body fetch happens.',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://example.com/story');
    expect(head?.force_body_fetch).toBe(true);
    expect(head?.snippet).toContain('publisher-owned feed description');
  });

  it('two GN-feed items with different <source> values yield two distinct source_names (the bug fix)', () => {
    const parsed = {
      rss: {
        channel: {
          item: [
            {
              title: 'First story from publisher A',
              link: 'https://news.google.com/articles/aaa',
              pubDate: 'Mon, 05 May 2026 04:30:00 GMT',
              source: 'Help Net Security',
            },
            {
              title: 'Second story from publisher B',
              link: 'https://news.google.com/articles/bbb',
              pubDate: 'Mon, 05 May 2026 04:30:00 GMT',
              source: 'HackerNoon',
            },
          ],
        },
      },
    };
    const heads = extract(parsed);
    expect(heads).toHaveLength(2);
    expect(heads.map((h) => h.source_name)).toEqual(['Help Net Security', 'HackerNoon']);
  });
});
