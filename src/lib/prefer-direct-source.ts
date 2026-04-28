// Implements REQ-PIPE-001
//
// Google News emits aggregator-wrapper URLs (https://news.google.com/articles/CCAi…)
// that canonicalize to a different form than the underlying publisher
// or community link, so the canonical-URL dedup pass in fanOutForTags
// treats the Google News copy and the direct copy of the same story
// as separate articles. The user's reported symptom: one trending
// story appearing 4× on /digest, ingested at slightly different times
// from "Google News — X" wrappers and the original direct source.
//
// The user's heuristic: "Google News should only be accepted as a
// source if no other direct source is available." This module
// implements that as a post-canonical-dedup pass:
//
//   1. Detect Google News headlines by URL host (works for both the
//      hardcoded GENERIC_SOURCES.googlenews adapter and the curated
//      `google-news-*` feeds whose URLs all live under news.google.com).
//   2. For each Google News headline, scan the remaining headlines for
//      a non-Google headline that shares ≥2 meaningful tokens with the
//      Google News title.
//   3. If a match is found, drop the Google News headline and merge its
//      `source_tags` into the surviving direct headline so the user's
//      tag-of-discovery is preserved.
//
// The token threshold is intentionally ≥2 (not ≥1 like
// `titlesShareAnyToken` in title-overlap.ts): we are acting on the
// signal to DROP an article, so high precision matters more than
// recall. A single-token coincidence is too noisy.
//
// When no direct duplicate exists for a Google News headline, it is
// kept — the heuristic is "prefer direct if available", not "delete
// Google News".

import type { Headline } from '~/lib/types';
import { tokenizeTitle } from '~/lib/title-overlap';

/** Match Google News URLs regardless of which feed they came from
 *  (hardcoded adapter vs curated wrapper). */
export function isGoogleNewsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'news.google.com';
  } catch {
    return false;
  }
}

/** Count of tokens shared between two titles (lowercase, length ≥ 4,
 *  stopwords excluded — same canonical tokenisation used elsewhere). */
function sharedTokenCount(a: string, b: string): number {
  const tokensA = tokenizeTitle(a);
  const tokensB = tokenizeTitle(b);
  let count = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) count += 1;
  }
  return count;
}

/** Drop Google News headlines whose title shares ≥2 meaningful tokens
 *  with a non-Google-News headline already in the list. Surviving
 *  direct headlines absorb the dropped Google News entry's
 *  `source_tags` so multi-tag discovery state is preserved.
 *
 *  Input order is preserved for the survivors. The function is pure;
 *  it returns a new array and does not mutate inputs (immutability
 *  rule across the pipeline).
 */
export function preferDirectOverGoogleNews(
  headlines: readonly Headline[],
): Headline[] {
  // Partition once so the inner loop only walks direct headlines.
  const direct: Headline[] = [];
  const google: Headline[] = [];
  for (const h of headlines) {
    if (isGoogleNewsUrl(h.url)) google.push(h);
    else direct.push(h);
  }

  if (google.length === 0) return [...headlines];

  // For each Google News headline, find the FIRST direct headline that
  // shares ≥2 tokens. If found, drop the Google News one and union
  // source_tags onto the matched direct headline.
  const directOut: Headline[] = direct.map((h) => ({
    ...h,
    source_tags: [...(h.source_tags ?? [])],
  }));
  const survivingGoogle: Headline[] = [];
  for (const g of google) {
    let absorbed = false;
    for (const d of directOut) {
      if (sharedTokenCount(g.title, d.title) >= 2) {
        const merged = new Set(d.source_tags ?? []);
        for (const t of g.source_tags ?? []) merged.add(t);
        d.source_tags = Array.from(merged);
        absorbed = true;
        break;
      }
    }
    if (!absorbed) survivingGoogle.push(g);
  }

  // Reassemble in the original input order so downstream truncation
  // (MAX_COMBINED_HEADLINES cap) stays deterministic.
  const dropped = new Set(google.filter((g) => !survivingGoogle.includes(g)));
  const directReplay = new Map<string, Headline>();
  for (const d of directOut) directReplay.set(d.url, d);

  const out: Headline[] = [];
  for (const h of headlines) {
    if (dropped.has(h)) continue;
    if (isGoogleNewsUrl(h.url)) {
      out.push(h);
    } else {
      const updated = directReplay.get(h.url);
      out.push(updated ?? h);
    }
  }
  return out;
}
