// Tests for src/lib/prefer-direct-source.ts — REQ-PIPE-001 dedup
// heuristic. The user reported one trending story appearing 4× on
// /digest because Google News aggregator-wrapper URLs canonicalise
// to a different form than the original publisher/HN/Reddit links,
// so the canonical-URL pass in fanOutForTags treats the Google News
// copy and the direct copy of the same story as separate articles.
//
// This module's contract: drop the Google News copy when a direct
// copy of the same story (≥2 shared meaningful tokens) is present;
// keep the Google News copy when no direct copy exists.

import { describe, it, expect } from 'vitest';
import {
  isGoogleNewsUrl,
  preferDirectOverGoogleNews,
} from '~/lib/prefer-direct-source';
import type { Headline } from '~/lib/types';

function h(
  title: string,
  url: string,
  source_name: string,
  source_tags: string[] = [],
): Headline {
  return { title, url, source_name, source_tags };
}

describe('isGoogleNewsUrl — REQ-PIPE-001', () => {
  it('matches the hardcoded GENERIC_SOURCES.googlenews adapter URL shape', () => {
    expect(
      isGoogleNewsUrl(
        'https://news.google.com/rss/search?q=anthropic&hl=en-US&gl=US&ceid=US:en',
      ),
    ).toBe(true);
  });

  it('matches Google News article aggregator-wrapper URLs', () => {
    expect(
      isGoogleNewsUrl(
        'https://news.google.com/articles/CCAiC2RVQndUaDZHV1VFTUFFAQ?hl=en-US',
      ),
    ).toBe(true);
  });

  it('returns false for HN, Reddit, and direct publisher URLs', () => {
    expect(isGoogleNewsUrl('https://news.ycombinator.com/item?id=12345')).toBe(false);
    expect(isGoogleNewsUrl('https://www.reddit.com/r/programming/comments/abc/')).toBe(false);
    expect(isGoogleNewsUrl('https://blog.cloudflare.com/some-post/')).toBe(false);
  });

  it('returns false on unparseable input rather than throwing', () => {
    expect(isGoogleNewsUrl('not-a-url')).toBe(false);
    expect(isGoogleNewsUrl('')).toBe(false);
  });
});

describe('preferDirectOverGoogleNews — REQ-PIPE-001', () => {
  it('drops a Google News headline when a direct headline shares ≥2 meaningful tokens', () => {
    const input: Headline[] = [
      h(
        'Anthropic releases Claude Sonnet 4.6 with extended context window',
        'https://news.ycombinator.com/item?id=99999',
        'hackernews',
        ['ai-agents'],
      ),
      h(
        'Anthropic releases Claude Sonnet 4.6 with extended context window',
        'https://news.google.com/articles/CBAi-something',
        'googlenews',
        ['generative-ai'],
      ),
    ];
    const out = preferDirectOverGoogleNews(input);
    expect(out).toHaveLength(1);
    expect(out[0]?.source_name).toBe('hackernews');
    // The direct headline absorbs the Google News entry's source_tags
    // so multi-tag discovery state is preserved.
    expect(out[0]?.source_tags).toEqual(
      expect.arrayContaining(['ai-agents', 'generative-ai']),
    );
  });

  it('keeps the Google News headline when no direct duplicate exists', () => {
    const input: Headline[] = [
      h(
        'Obscure regional bakery uses sourdough starter from 1843',
        'https://news.google.com/articles/CAAi-other',
        'googlenews',
        ['food'],
      ),
      h(
        'Cloudflare announces Workers Smart Placement v2',
        'https://blog.cloudflare.com/smart-placement-v2/',
        'cloudflare-blog',
        ['cloudflare'],
      ),
    ];
    const out = preferDirectOverGoogleNews(input);
    // Both survive — no shared-token overlap between the two stories.
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.source_name).sort()).toEqual(
      ['cloudflare-blog', 'googlenews'],
    );
  });

  it('does not drop a Google News headline that shares only ONE token with a direct one (high-precision threshold)', () => {
    // "kubernetes" overlaps but "release" + "outage" + "ec2" + "1.30" are
    // disjoint; only one shared token → keep both. This is the explicit
    // high-precision contract: ≥2 token overlap required to drop.
    const input: Headline[] = [
      h(
        'Kubernetes 1.30 release notes published',
        'https://kubernetes.io/blog/1-30-release/',
        'kubernetes-blog',
      ),
      h(
        'Kubernetes outage on AWS EC2 affects multiple regions',
        'https://news.google.com/articles/X',
        'googlenews',
      ),
    ];
    const out = preferDirectOverGoogleNews(input);
    expect(out).toHaveLength(2);
  });

  it('preserves input order for the surviving headlines', () => {
    const input: Headline[] = [
      h('first direct article about something interesting', 'https://example.com/a', 'a'),
      h(
        'matching google news article about something interesting indeed',
        'https://news.google.com/articles/dropped',
        'googlenews',
      ),
      h('second direct article unrelated stuff entirely', 'https://example.com/b', 'b'),
      h(
        'unique google news headline nothing else covers',
        'https://news.google.com/articles/kept',
        'googlenews',
      ),
    ];
    const out = preferDirectOverGoogleNews(input);
    // The first Google News entry is dropped (overlaps the first
    // direct one); the order of the survivors mirrors input order.
    expect(out.map((x) => x.url)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
      'https://news.google.com/articles/kept',
    ]);
  });

  it('is a no-op when the input has no Google News headlines', () => {
    const input: Headline[] = [
      h('A', 'https://example.com/1', 'a'),
      h('B', 'https://example.com/2', 'b'),
    ];
    const out = preferDirectOverGoogleNews(input);
    expect(out).toEqual(input);
  });

  it('is a no-op when every headline is Google News (no direct fallback)', () => {
    const input: Headline[] = [
      h('Story one about quantum computing breakthrough', 'https://news.google.com/articles/1', 'googlenews'),
      h('Story two about supply chain attack on npm', 'https://news.google.com/articles/2', 'googlenews'),
    ];
    const out = preferDirectOverGoogleNews(input);
    // Both kept — there is no direct source to prefer.
    expect(out).toHaveLength(2);
  });

  it('does not mutate the input array or its elements', () => {
    const direct = h('Anthropic Claude Sonnet release notes', 'https://example.com/a', 'a', ['x']);
    const google = h(
      'Anthropic Claude Sonnet release notes mirrored',
      'https://news.google.com/articles/Y',
      'googlenews',
      ['y'],
    );
    const input: Headline[] = [direct, google];
    const inputSnapshot = JSON.parse(JSON.stringify(input));
    preferDirectOverGoogleNews(input);
    expect(JSON.parse(JSON.stringify(input))).toEqual(inputSnapshot);
  });
});
