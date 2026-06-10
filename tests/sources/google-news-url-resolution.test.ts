// Implements REQ-PIPE-001
//
// Pins the Google News `<source url="...">` URL-extraction behaviour.
// The RSS items Google News serves wrap every link in a redirect
// envelope: `<link>https://news.google.com/rss/articles/CBMi…</link>`.
// The publisher name is in `<source>`, while the `url` attribute may be
// either a concrete article URL or only the publisher homepage. Homepage
// promotion breaks source links on merged articles, so only article-shaped
// source URLs are promoted.

import { describe, it, expect } from 'vitest';
import { adaptersForDiscoveredFeeds } from '~/lib/sources';

function rssExtractor() {
  const adapters = adaptersForDiscoveredFeeds(
    [{ name: 'Google News: paloaltonetworks', url: 'https://news.google.com/rss/search?q=palo+alto', kind: 'rss' }],
    { trusted: true },
  );
  const a = adapters[0];
  if (a === undefined) throw new Error('synthetic RSS adapter not built');
  return a.extract;
}

describe('Google News URL resolution — article-shaped <source url> wins over <link>', () => {
  const extract = rssExtractor();

  it('promotes the publisher URL when link is a Google News redirect and source URL is article-shaped', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Palo Alto Networks Shares Surge',
            link: 'https://news.google.com/rss/articles/CBMiX_redirectToken',
            source: {
              url: 'https://www.tradingview.com/news/some-article',
              '#text': 'TradingView',
            },
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://www.tradingview.com/news/some-article');
    expect(head?.source_name).toBe('TradingView');
  });

  it('keeps the Google News link when <source url> is only a publisher homepage', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: "'Hades' Campaign Against PyPI Puts New Spin on Shai-Hulud",
            link: 'https://news.google.com/rss/articles/CBMiX_redirectToken',
            source: {
              url: 'https://www.darkreading.com',
              '#text': 'Dark Reading',
            },
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://news.google.com/rss/articles/CBMiX_redirectToken');
    expect(head?.source_name).toBe('Dark Reading');
  });

  it('keeps original link when <source> has no url attribute', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'No source url',
            link: 'https://news.google.com/rss/articles/CBMiX_redirectToken',
            // bare-string <source>Publisher</source> — fxp emits this
            // as a string, not an object, so no url attribute exists.
            source: 'Some Publisher',
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe(
      'https://news.google.com/rss/articles/CBMiX_redirectToken',
    );
    expect(head?.source_name).toBe('Some Publisher');
  });

  it('keeps original link when the link is NOT a Google News URL', () => {
    // Non-GN feeds occasionally include <source> too (re-syndication).
    // We must not silently swap their URL — only Google News redirects
    // are known to need this fix-up.
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Cross-syndicated',
            link: 'https://blog.example.com/original',
            source: {
              url: 'https://other.example.com/mirror',
              '#text': 'Other Site',
            },
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://blog.example.com/original');
    expect(head?.source_name).toBe('Other Site');
  });

  it('rejects non-http(s) protocols in <source url> (defense)', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Malicious source url',
            link: 'https://news.google.com/rss/articles/CBMiX',
            source: {
              url: 'javascript:alert(1)',
              '#text': 'Malicious',
            },
          },
        },
      },
    };
    const [head] = extract(parsed);
    // Falls back to the original Google News link rather than promoting
    // the bogus protocol. The downstream URL canonicalizer would reject
    // it anyway, but we cut it at the parse boundary.
    expect(head?.url).toBe('https://news.google.com/rss/articles/CBMiX');
  });

  it('falls back to original link when <source url> is malformed', () => {
    const parsed = {
      rss: {
        channel: {
          item: {
            title: 'Garbage source url',
            link: 'https://news.google.com/rss/articles/CBMiX',
            source: {
              url: 'not a url at all',
              '#text': 'Publisher',
            },
          },
        },
      },
    };
    const [head] = extract(parsed);
    expect(head?.url).toBe('https://news.google.com/rss/articles/CBMiX');
  });

  it('handles real-world Google News RSS shape end-to-end', () => {
    // Mirrors the live Google News RSS payload that produced
    // 01KRB0ZXFM5MZREWBY5DX0EBYG in prod on 2026-05-10. Confirms
    // canonical-URL dedup will see article-shaped publisher URLs
    // instead of news.google.com.
    const parsed = {
      rss: {
        channel: {
          item: [
            {
              title: 'Palo Alto Networks Shares Surge as Cybersecurity Market Revives',
              link: 'https://news.google.com/rss/articles/CBMi6gFBVV95cUxPTVNQOHh6b0ZKYXFIRl9GbUxHNlBfVF',
              pubDate: 'Sun, 10 May 2026 22:38:00 GMT',
              source: {
                url: 'https://www.msn.com/en-us/money/some-path',
                '#text': 'MSN',
              },
            },
            {
              title: 'Analysts Upgrade Palo Alto Valuation After CEO Share Buyback and AI Deals',
              link: 'https://news.google.com/rss/articles/CBMinwFBVV95cUxNU3d3d1RNYlUzZ2x0OTRaMmYxWmhqSF',
              pubDate: 'Sun, 10 May 2026 22:10:00 GMT',
              source: {
                url: 'https://finance.yahoo.com/news/analysts-upgrade-palo-alto',
                '#text': 'Yahoo Finance',
              },
            },
          ],
        },
      },
    };
    const heads = extract(parsed);
    expect(heads).toHaveLength(2);
    expect(heads[0]?.url).toBe('https://www.msn.com/en-us/money/some-path');
    expect(heads[0]?.source_name).toBe('MSN');
    expect(heads[1]?.url).toBe(
      'https://finance.yahoo.com/news/analysts-upgrade-palo-alto',
    );
    expect(heads[1]?.source_name).toBe('Yahoo Finance');
  });
});
