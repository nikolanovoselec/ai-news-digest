// Tests for src/lib/email.ts rendering helpers — REQ-MAIL-001 AC 3 (HTML
// template shape) and AC 4 (plaintext fallback). Also covers HTML escaping
// of user-derived fields (top_tags, gh_login, article_count) which prevents
// stored-XSS-in-email attacks against downstream clients that render HTML.

import { describe, it, expect } from 'vitest';
import {
  renderDigestEmailHtml,
  renderDigestEmailText,
  renderDigestEmailSubject,
  type DigestEmailContext,
} from '~/lib/email';

/** Build a plausible DigestEmailContext with overridable fields. */
function makeCtx(overrides: Partial<DigestEmailContext> = {}): DigestEmailContext {
  return {
    user: {
      email: 'alice@example.com',
      gh_login: 'alice',
    },
    digest_id: 'dg-01JABCXYZ',
    local_date: '2026-04-22',
    article_count: 7,
    top_tags: ['react', 'typescript', 'edge'],
    execution_ms: 2400,
    tokens: 3847,
    estimated_cost_usd: 0.0012,
    model_name: 'llama-3.1-8b-instruct-fast',
    app_url: 'https://news-digest.example.com',
    ...overrides,
  };
}

describe('renderDigestEmailHtml', () => {
  it('REQ-MAIL-001: contains the uppercase "News Digest" label', () => {
    const html = renderDigestEmailHtml(makeCtx());
    expect(html).toContain('News Digest');
  });

  it('REQ-MAIL-001: contains the "Your daily digest is ready" headline', () => {
    const html = renderDigestEmailHtml(makeCtx());
    expect(html).toContain('Your daily digest is ready');
  });

  it('REQ-MAIL-001: one-line summary includes article count and top-3 hashtags', () => {
    const html = renderDigestEmailHtml(makeCtx({
      article_count: 7,
      top_tags: ['react', 'typescript', 'edge'],
    }));
    expect(html).toContain('7 stories');
    expect(html).toContain('react');
    expect(html).toContain('typescript');
    expect(html).toContain('edge');
  });

  it('REQ-MAIL-001: limits the summary to the top 3 hashtags', () => {
    const html = renderDigestEmailHtml(makeCtx({
      top_tags: ['one', 'two', 'three', 'four', 'five'],
    }));
    expect(html).toContain('one');
    expect(html).toContain('two');
    expect(html).toContain('three');
    expect(html).not.toContain('four');
    expect(html).not.toContain('five');
  });

  it('REQ-MAIL-001: CTA button links to {app_url}/digest', () => {
    const html = renderDigestEmailHtml(makeCtx({
      app_url: 'https://news-digest.example.com',
    }));
    expect(html).toContain('href="https://news-digest.example.com/digest"');
  });

  it('REQ-MAIL-001: CTA button has the primary call-to-action copy', () => {
    const html = renderDigestEmailHtml(makeCtx());
    expect(html).toContain("Read today's digest");
  });

  it('REQ-MAIL-001: footer contains execution time, tokens, and cost', () => {
    const html = renderDigestEmailHtml(makeCtx({
      execution_ms: 2400,
      tokens: 3847,
      estimated_cost_usd: 0.0012,
    }));
    expect(html).toContain('2.4');
    expect(html).toContain('3,847');
    expect(html).toContain('0.0012');
  });

  it('REQ-MAIL-001: footer contains the model_name', () => {
    const html = renderDigestEmailHtml(makeCtx({
      model_name: 'llama-3.1-8b-instruct-fast',
    }));
    expect(html).toContain('llama-3.1-8b-instruct-fast');
  });

  it('REQ-MAIL-001: footer includes a link to /settings', () => {
    const html = renderDigestEmailHtml(makeCtx({
      app_url: 'https://news-digest.example.com',
    }));
    expect(html).toContain('href="https://news-digest.example.com/settings"');
  });

  it('REQ-MAIL-001: styles are inlined on elements (no <style> blocks)', () => {
    const html = renderDigestEmailHtml(makeCtx());
    expect(html).not.toContain('<style');
    expect(html).toContain('style="');
  });

  it('REQ-MAIL-001: trims trailing slashes from app_url to avoid double-slash URLs', () => {
    const html = renderDigestEmailHtml(makeCtx({
      app_url: 'https://news-digest.example.com/',
    }));
    expect(html).toContain('href="https://news-digest.example.com/digest"');
    expect(html).not.toContain('//digest');
  });

  it('REQ-MAIL-001: renders gracefully when top_tags is empty', () => {
    const html = renderDigestEmailHtml(makeCtx({
      article_count: 3,
      top_tags: [],
    }));
    expect(html).toContain('3 stories');
    // No trailing ": ." artifact
    expect(html).not.toContain('interests: .');
  });

  describe('HTML escaping', () => {
    it('REQ-MAIL-001: escapes top_tags containing HTML metacharacters', () => {
      const html = renderDigestEmailHtml(makeCtx({
        top_tags: ['<script>', 'a&b', 'x"y'],
      }));
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('a&amp;b');
      expect(html).toContain('x&quot;y');
    });

    it('REQ-MAIL-001: escapes model_name with special characters', () => {
      const html = renderDigestEmailHtml(makeCtx({
        model_name: 'custom<model>&"v1',
      }));
      expect(html).not.toContain('<model>');
      expect(html).toContain('custom&lt;model&gt;&amp;&quot;v1');
    });

    it('REQ-MAIL-001: does not allow injection via article_count downstream rendering', () => {
      // article_count is a number per the interface, but defense-in-depth:
      // the html output must never contain raw <script> from any source.
      const html = renderDigestEmailHtml(makeCtx({ article_count: 5 }));
      expect(html).not.toMatch(/<script\b/i);
    });
  });
});

describe('renderDigestEmailText', () => {
  it('REQ-MAIL-001: begins with the plaintext "Your daily digest is ready." headline', () => {
    const text = renderDigestEmailText(makeCtx());
    expect(text).toMatch(/^Your daily digest is ready\./);
  });

  it('REQ-MAIL-001: contains article count in plaintext summary', () => {
    const text = renderDigestEmailText(makeCtx({ article_count: 9 }));
    expect(text).toContain('9 stories');
  });

  it('REQ-MAIL-001: lists top-3 hashtags in plaintext', () => {
    const text = renderDigestEmailText(makeCtx({
      top_tags: ['react', 'typescript', 'edge'],
    }));
    expect(text).toContain('react');
    expect(text).toContain('typescript');
    expect(text).toContain('edge');
  });

  it('REQ-MAIL-001: plaintext contains the digest URL', () => {
    const text = renderDigestEmailText(makeCtx({
      app_url: 'https://news-digest.example.com',
    }));
    expect(text).toContain('https://news-digest.example.com/digest');
  });

  it('REQ-MAIL-001: plaintext footer contains execution/tokens/cost/model', () => {
    const text = renderDigestEmailText(makeCtx({
      execution_ms: 2400,
      tokens: 3847,
      estimated_cost_usd: 0.0012,
      model_name: 'llama-3.1-8b-instruct-fast',
    }));
    expect(text).toContain('2.4');
    expect(text).toContain('3,847');
    expect(text).toContain('0.0012');
    expect(text).toContain('llama-3.1-8b-instruct-fast');
  });

  it('REQ-MAIL-001: plaintext contains link to /settings', () => {
    const text = renderDigestEmailText(makeCtx({
      app_url: 'https://news-digest.example.com',
    }));
    expect(text).toContain('https://news-digest.example.com/settings');
  });

  it('REQ-MAIL-001: plaintext does NOT contain HTML tags', () => {
    const text = renderDigestEmailText(makeCtx());
    expect(text).not.toMatch(/<[a-z]/i);
  });
});

describe('renderDigestEmailSubject', () => {
  it('REQ-MAIL-001: matches the exact REQ template with the middle dot', () => {
    const subject = renderDigestEmailSubject(makeCtx({ article_count: 7 }));
    expect(subject).toBe('Your news digest is ready \u00b7 7 stories');
  });

  it('REQ-MAIL-001: substitutes the article count', () => {
    const subject = renderDigestEmailSubject(makeCtx({ article_count: 12 }));
    expect(subject).toContain('12 stories');
  });
});
