// Implements REQ-PIPE-010
// Implements REQ-PIPE-011
// Implements CON-SEC-002
//
// Article-body fetcher. When a feed's snippet is thin (or absent),
// a wrapper URL needs direct-page grounding, or a URL looks portal-like,
// this module fetches the page directly, extracts readable text from the
// HTML, scores whether the page looks article-like, and returns capped
// text so the chunk prompt stays budget-safe.
//
// Security + cost controls:
//   - `isUrlSafe` SSRF guard on every target URL and followed redirect
//     target (HTTPS-only, no private/loopback/link-local ranges).
//   - 8-second timeout per article fetch, including redirects.
//   - 1.5 MB response cap.
//   - 20-worker concurrency bucket when called in bulk so 500
//     candidates don't stampede the network.
//   - Plaintext output capped at 15000 characters - long-form
//     essays (Substack/Medium-style posts) need the headroom; a
//     2-3K cap was clipping at the article's preamble before any
//     concrete content reached the LLM.

import { isUrlSafe } from '~/lib/ssrf';
import { mapConcurrent } from '~/lib/concurrency';
import { stripHtmlToText } from '~/lib/html-text';
import {
  ARTICLE_FETCH_TIMEOUT_MS,
  ARTICLE_MAX_BODY_BYTES,
} from '~/lib/fetch-policy';

// Path-based and markup-based heuristics share a minimum signal floor:
// if both dimensions look like homepage/portal + boilerplate, we
// treat the fetch as non-article and keep it out of LLM summarization.
const LANDING_SLUG_MAX_LENGTH = 20;
const LANDING_URL_PATH_SCORE_PENALTY = 2;
const ARTICLE_LIKELIHOOD_THRESHOLD = 4;
const ARTICLE_WORD_SCORE_THRESHOLD = 100;
const ARTICLE_MIN_WORDS_FOR_ARTICLE = 100;

/** Default fan-out for body fetches. Roughly 2x the feed-fetch limit
 *  because article HTML pages are smaller, faster, and tolerate
 *  higher origin pressure than feed re-fetches. */
const ARTICLE_BODY_FETCH_CONCURRENCY = 20;
const MAX_ARTICLE_FETCH_REDIRECTS = 5;

// CF-056: use the imported names directly instead of local re-aliases.
const SNIPPET_CAP = 15000;

/**
 * Lightweight result shape for body fetches that carry quality metadata.
 * The text is already capped + stripped; `isLikelyArticle` is the
 * deterministic gate used before LLM summarization.
 */
export interface ArticleBodyResult {
  /** Extracted, de-duplicated body text (15000-char cap already applied). */
  text: string;
  /** Deterministic article-likelihood classification from HTML + URL.
   * `false` means the page is likely a landing page, feed listing,
   * or generic boilerplate page. */
  isLikelyArticle: boolean;
  /** Optional diagnostics for debug and future tuning. */
  reasonCodes: string[];
}

/**
 * Return true when a URL looks like a portal/home page and not an
 * article permalink.
 *
 * The rule is intentionally conservative: it only marks obviously
 * portal-like paths, short one-segment slugs, and category/search
 * entry points. False positives are tolerated because this gate is
 * followed by HTML-content scoring in {@link scoreArticleHeuristics}.
 */
export function isLikelyLandingOrPortalUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const path = parsed.pathname.toLowerCase().replace(/\/+$/, '');
  if (path === '' || path === '/') return true;

  const parts = path
    .split('/')
    .map((segment) => segment.toLowerCase())
    .filter((segment) => segment !== '');
  if (parts.length === 0) return true;

  const [first, second] = parts;
  if (first === undefined) return true;

  const firstIsPortal =
    first === 'news'
    || first === 'top'
    || first === 'tag'
    || first === 'tags'
    || first === 'topic'
    || first === 'topics'
    || first === 'category'
    || first === 'categories'
    || first === 'search'
    || first === 'home'
    || first === 'about'
    || first === 'contact'
    || first === 'settings';

  const secondIsPortal =
    second === 'tag'
    || second === 'tags'
    || second === 'topic'
    || second === 'topics'
    || second === 'category'
    || second === 'categories'
    || second === 'tagged';

  if (firstIsPortal || secondIsPortal) return true;

  if (parts.length === 1) {
    const slugLooksArticle =
      first.includes('-')
      || /\d{4}/.test(first)
      || /\.(html?|php|aspx?)$/.test(first)
      || first.length > LANDING_SLUG_MAX_LENGTH;

    if (!slugLooksArticle && first.length >= 4) return true;
  }

  return false;
}

function scoreArticleHeuristics(
  html: string,
  text: string,
  sourceUrl: string,
): { isLikelyArticle: boolean; reasonCodes: string[] } {
  const htmlLower = html.toLowerCase();
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);

  const reasons: string[] = [];
  let score = 0;

  if (words.length >= ARTICLE_MIN_WORDS_FOR_ARTICLE) {
    score += 2;
    reasons.push('word_count_ok');
  }

  if (/<article\b/i.test(htmlLower)) {
    score += 4;
    reasons.push('article_tag');
  }
  if (/<main\b/i.test(htmlLower)) {
    score += 2;
    reasons.push('main_tag');
  }
  if (/<h1\b/i.test(htmlLower)) {
    score += 1;
    reasons.push('h1_present');
  }

  const paragraphCount = (htmlLower.match(/<p\b/g) ?? []).length;
  if (paragraphCount >= 2) {
    score += 1;
    reasons.push('multiple_paragraphs');
  }

  if (/<div[^>]*(?:class|id)=["'][^"']*(?:article|post|story|entry|content|news|blog|prose|markdown-body|gh-content|post-content)[^"']*["'][^>]*>/i.test(htmlLower)) {
    score += 3;
    reasons.push('article_container_class');
  }

  if (/<meta[^>]+(?:property|name)=["'](?:og:type|twitter:card)["'][^>]+content=["'](?:article|summary)["']/i.test(htmlLower)) {
    score += 3;
    reasons.push('article_meta');
  }

  if (/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?@type[\s\S]*?(?:"|'|\{)?(?:Article|NewsArticle|BlogPosting|TechArticle|Analysis|Report|Opinion)(?:"|'|\})/i.test(html)) {
    score += 3;
    reasons.push('jsonld_article_schema');
  }

  if (text.toLowerCase().includes('article') && !/\bpress.?release\b/.test(text.toLowerCase())) {
    score += 1;
    reasons.push('article_keyword');
  }

  if (words.length < ARTICLE_WORD_SCORE_THRESHOLD) {
    score -= 2;
    reasons.push('word_count_low');
  }

  if (isLikelyLandingOrPortalUrl(sourceUrl)) {
    score -= LANDING_URL_PATH_SCORE_PENALTY;
    reasons.push('portal_url_path');
  }

  const links = htmlLower.match(/<a\s+[^>]*href=/g)?.length ?? 0;
  if (links > 12 && words.length > 0) {
    const wordsPerLink = words.length / links;
    if (wordsPerLink < 8) {
      score -= 1;
      reasons.push('link_density_high');
    }
  }

  return {
    isLikelyArticle: score >= ARTICLE_LIKELIHOOD_THRESHOLD,
    reasonCodes: reasons,
  };
}

/**
 * Extract readable text from raw HTML. Runs the heuristic through
 * several container candidates and takes whichever produces the
 * LONGEST cleaned text - sites structure their markup wildly
 * differently:
 *   <article>, <main>, <div class=".post-content|.entry-content|
 *   .article-body|.post-body|.article-content|.content|.prose|
 *   .markdown-body|.rich-text|.gh-content|.post-entry|...">
 * If NONE of those land a body, fall through to the full stripped
 * `<body>` - catches plain-`<p>`-tag pages too. Script/style/nav/
 * header/footer/aside blocks are removed first so their contents
 * don't leak into the text.
 */
export function extractArticleText(html: string): string {
  // Drop non-content blocks BEFORE tag-stripping so their contents
  // don't leak in.
  //
  // Closing-tag pattern uses `\b[^>]*>` so any non-`>` characters
  // (whitespace, attributes, junk) between the tag name and `>` are
  // accepted (e.g. `</script >`, `</script\t\n>`, `</script foo>`,
  // `</script bar baz>`). HTML parsers tolerate all of these, and a
  // strict `</script>` literal - or even `</script\s*>` (CodeQL
  // #171) - lets an attacker smuggle a `<script>...</script foo>`
  // block past the strip and into the LLM-prompt body when the
  // attribute-shaped close is the only closing variant in the doc.
  // The `\b` anchor blocks `</scripted>` collisions.
  // CF-025 - combined alternation runs ONE regex pass over the body
  // instead of nine sequential passes (~10K full-body passes per cron
  // tick at 100 candidates × 9 strips). Backreference `\1` keeps the
  // open and close tag names in lockstep so cross-tag matches like
  // `<script>...</style>` still close on `</script>`.
  const cleaned = html.replace(
    /<(script|style|noscript|nav|header|footer|aside|form|svg)\b[\s\S]*?<\/\1\b[^>]*>/gi,
    ' ',
  );

  // Collect every candidate container body text - we take whichever
  // produces the longest clean output.
  const candidates: string[] = [];
  for (const m of cleaned.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)) {
    if (m[1] !== undefined) candidates.push(m[1]);
  }
  for (const m of cleaned.matchAll(/<main[^>]*>([\s\S]*?)<\/main>/gi)) {
    if (m[1] !== undefined) candidates.push(m[1]);
  }
  const containerPattern =
    /<(?:div|section)[^>]*(?:class|id)=["'][^"']*(?:post-content|post-body|post-entry|post-full-content|entry-content|article-body|article-content|article__content|gh-content|markdown-body|prose|rich-text|page-content|story-body|story__content|post__content|content-body|content__body|story-content|mw-parser-output|notion-page-content|rst-content|blogpost|blog-post)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi;
  for (const m of cleaned.matchAll(containerPattern)) {
    if (m[1] !== undefined) candidates.push(m[1]);
  }
  // Final fallback: stripped <body>. Noisy but catches everything.
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch !== null && bodyMatch[1] !== undefined) {
    candidates.push(bodyMatch[1]);
  } else {
    candidates.push(cleaned);
  }

  let best = '';
  for (const c of candidates) {
    const text = stripHtmlToText(c);
    if (text.length > best.length) best = text;
  }
  const result = best.length > SNIPPET_CAP ? best.slice(0, SNIPPET_CAP) : best;
  return result;
}


/**
 * Fetch one article URL and return its extracted body text, or
 * null on any failure (SSRF reject, timeout, non-2xx, oversized
 * body, empty after extraction). Never throws.
 *
 * Sends a browser-like User-Agent - some CDN / WAF configs flag
 * any UA containing 'bot' or 'curl' and return 403. Posing as
 * Firefox is honest-ish (we ARE a fetch client) and doesn't
 * trigger those filters.
 */
export async function fetchArticleBodyWithQuality(
  url: string,
  contactUrl?: string,
): Promise<ArticleBodyResult | null> {
  if (!isUrlSafe(url)) return null;

  const ua =
    contactUrl !== undefined && contactUrl !== ''
      ? `Mozilla/5.0 (compatible; news-digest/1.0; +${contactUrl})`
      : 'Mozilla/5.0 (compatible; news-digest/1.0)';
  try {
    const fetchSignal = AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS);
    let currentUrl = url;
    let response: Response | null = null;
    for (let redirectHops = 0; redirectHops <= MAX_ARTICLE_FETCH_REDIRECTS; redirectHops += 1) {
      if (!isUrlSafe(currentUrl)) return null;
      response = await fetch(currentUrl, {
        signal: fetchSignal,
        redirect: 'manual',
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml,text/plain,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (response.status < 300 || response.status >= 400) break;
      if (redirectHops === MAX_ARTICLE_FETCH_REDIRECTS) return null;

      const location = response.headers.get('location');
      if (location === null || location.trim() === '') return null;

      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).toString();
      } catch {
        return null;
      }
      if (!isUrlSafe(nextUrl)) return null;
      currentUrl = nextUrl;
    }
    if (response === null || !response.ok) return null;

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType !== '' &&
        !contentType.includes('html') &&
        !contentType.includes('text/plain') &&
        !contentType.includes('application/xml')) {
      return null;
    }

    const reader = response.body?.getReader();
    if (reader === undefined) return null;

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value !== undefined) {
        total += value.byteLength;
        if (total > ARTICLE_MAX_BODY_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }

    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.byteLength;
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const text = extractArticleText(html);
    if (text.length < 100) return null;

    const quality = scoreArticleHeuristics(html, text, currentUrl);
    return {
      text,
      isLikelyArticle: quality.isLikelyArticle,
      reasonCodes: quality.reasonCodes,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch one article URL and return its extracted body text, or
 * null on any failure (SSRF reject, timeout, non-2xx, oversized
 * body, empty after extraction). Never throws.
 */
export async function fetchArticleBody(
  url: string,
  contactUrl?: string,
): Promise<string | null> {
  const result = await fetchArticleBodyWithQuality(url, contactUrl);
  return result?.text ?? null;
}

/**
 * Fetch article bodies for a list of URLs with bounded concurrency.
 * Returns a map of url → body-text (or missing entry on failure).
 * Caller filters by which entries came back non-empty.
 */
export async function fetchArticleBodies(
  urls: readonly string[],
  concurrency = ARTICLE_BODY_FETCH_CONCURRENCY,
  contactUrl?: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await mapConcurrent(urls, concurrency, async (url) => {
    const body = await fetchArticleBody(url, contactUrl);
    if (body !== null && body !== '') out.set(url, body);
  });
  return out;
}

/**
 * Fetch article bodies for a list of URLs with bounded concurrency,
 * retaining article-likelihood quality metadata for deterministic gate.
 */
export async function fetchArticleBodiesWithQuality(
  urls: readonly string[],
  concurrency = ARTICLE_BODY_FETCH_CONCURRENCY,
  contactUrl?: string,
): Promise<Map<string, ArticleBodyResult>> {
  const out = new Map<string, ArticleBodyResult>();
  await mapConcurrent(urls, concurrency, async (url) => {
    const result = await fetchArticleBodyWithQuality(url, contactUrl);
    if (result !== null) out.set(url, result);
  });
  return out;
}
