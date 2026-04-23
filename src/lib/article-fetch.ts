// Implements REQ-PIPE-001
//
// Article-body fetcher. When a feed's snippet is thin (or absent),
// the LLM has nothing to summarize and falls back to boilerplate
// hallucination. This module fetches the article URL directly,
// extracts readable text from the HTML, and returns it capped at a
// reasonable size so the chunk prompt stays budget-safe.
//
// Security + cost controls:
//   - `isUrlSafe` SSRF guard on every target URL (HTTPS-only, no
//     private/loopback/link-local ranges).
//   - 5-second timeout per fetch.
//   - 1 MB response cap.
//   - 20-worker concurrency bucket when called in bulk so 500
//     candidates don't stampede the network.
//   - Plaintext output capped at 3000 characters — enough for a
//     200-250 word summary with context, not so much that the
//     per-chunk prompt balloons.

import { isUrlSafe } from '~/lib/ssrf';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 1_000_000;
const SNIPPET_CAP = 3000;

/**
 * Extract readable text from a raw HTML string. Prefers the inner
 * text of the first matching `<article>`, `<main>`, or `<div
 * id|class=~content|post|article>`. Falls back to the full body.
 * Strips script + style blocks, tags, HTML entities, collapses
 * whitespace, caps at SNIPPET_CAP characters.
 *
 * This is a heuristic, not a full Readability port — the goal is
 * enough clean text for the LLM to ground a summary in. Most feed
 * articles produce 500–3000 clean characters from this path.
 */
export function extractArticleText(html: string): string {
  // Drop script and style blocks BEFORE tag-stripping so their
  // contents don't leak into the text.
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

  // Prefer semantic containers in order of specificity.
  const articleMatch = body.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = articleMatch === null ? body.match(/<main[^>]*>([\s\S]*?)<\/main>/i) : null;
  const containerMatch = articleMatch === null && mainMatch === null
    ? body.match(
        /<div[^>]*(?:class|id)=["'][^"']*(?:post-content|article-body|post-body|entry-content|article-content|content)["'][^>]*>([\s\S]*?)<\/div>/i,
      )
    : null;

  if (articleMatch !== null) body = articleMatch[1] ?? body;
  else if (mainMatch !== null) body = mainMatch[1] ?? body;
  else if (containerMatch !== null) body = containerMatch[1] ?? body;

  const stripped = body.replace(/<[^>]+>/g, ' ');
  const decoded = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&#(\d+);/g, (_m, n: string) => {
      const code = Number.parseInt(n, 10);
      return Number.isFinite(code) && code >= 32 && code < 65536
        ? String.fromCharCode(code)
        : ' ';
    });
  const collapsed = decoded.replace(/\s+/g, ' ').trim();
  return collapsed.length > SNIPPET_CAP ? collapsed.slice(0, SNIPPET_CAP) : collapsed;
}

/**
 * Fetch one article URL and return its extracted body text, or
 * null on any failure (SSRF reject, timeout, non-2xx, oversized
 * body, empty after extraction). Never throws.
 */
export async function fetchArticleBody(url: string): Promise<string | null> {
  if (!isUrlSafe(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'news-digest/1.0 (+https://news.graymatter.ch)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('html')) return null;
    const reader = response.body?.getReader();
    if (reader === undefined) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    // Manual read loop so we can enforce MAX_BODY_BYTES without
    // buffering an entire multi-MB response.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value !== undefined) {
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) {
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
    return text.length >= 100 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch article bodies for a list of URLs with bounded concurrency.
 * Returns a map of url → body-text (or missing entry on failure).
 * Caller filters by which entries came back non-empty.
 */
export async function fetchArticleBodies(
  urls: readonly string[],
  concurrency = 20,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const queue = [...urls];
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const url = queue.shift();
      if (url === undefined) break;
      const body = await fetchArticleBody(url);
      if (body !== null && body !== '') out.set(url, body);
    }
  }
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return out;
}
