// Implements REQ-PIPE-003
//
// Deterministic same-source title-similarity merge. Runs after
// canonical-URL clustering (`clusterByCanonical`) and before chunking.
// Catches the Google News topical-aggregation case where one upstream
// feed surfaces multiple rewrites of the same vendor announcement -
// the LLM finalize pass cannot reliably catch these once they are
// fanned out into the full corpus, so they slip through as duplicate
// dashboard cards. URL-canonical clustering does not catch them
// because every Google News redirect produces a distinct canonical
// URL.
//
// Pure: no D1 / KV / fetch. Same shape and ordering rules as
// `mergeClustersByLlmHints` in dedupe.ts.

import {
  mergeClustersByLlmHints,
  type Cluster,
} from '~/lib/dedupe';

const TITLE_TOKEN_RE = /[a-z0-9]+/g;

const STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'under',
  'has', 'have', 'had', 'will', 'would', 'could', 'should', 'can',
  'are', 'was', 'were', 'been', 'being',
  'its', 'their', 'them', 'they',
  'more', 'less', 'than', 'also', 'only', 'just', 'now', 'new', 'old',
  // Common headline verbs that carry no event-identity signal.
  'launches', 'launch', 'launched', 'announces', 'announced',
  'introduces', 'introduced', 'rolls', 'deploys', 'deployed',
  'releases', 'released', 'unveils', 'unveiled', 'reveals', 'revealed',
  'gets', 'adds', 'plans', 'said', 'says', 'joins', 'partners',
  // Generic noun fillers in tech headlines.
  'tech', 'news', 'today', 'week', 'year',
]);

const DEFAULT_THRESHOLD = 0.4;
const PUBLISHED_AT_WINDOW_SECS = 24 * 60 * 60;

/** Tokenise a string for similarity comparison. */
function tokenize(text: string, extraStopwords: ReadonlySet<string>): Set<string> {
  const matches = text.toLowerCase().match(TITLE_TOKEN_RE) ?? [];
  const out = new Set<string>();
  for (const token of matches) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    if (extraStopwords.has(token)) continue;
    out.add(token);
  }
  return out;
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Tokens drawn from the source name are not similarity signal. Two
 * articles from "Google News - Anthropic" should not be considered
 * similar just because both titles contain "Anthropic" - the source
 * name itself dictates that vendor name appears in every headline.
 */
function sourceNameTokens(name: string): Set<string> {
  return tokenize(name, new Set());
}

/**
 * Merge clusters that share (a) identical primary `source_name`,
 * (b) `published_at` within {@link windowSecs}, and (c) title-token
 * Jaccard similarity at or above {@link threshold} (after stopword and
 * source-name token stripping).
 *
 * Conservative on purpose: never crosses source boundaries, never
 * crosses the published_at window. The contract is "same-publisher
 * near-duplicate-headline" - which is a high-precision signal for
 * Google News topical feeds where the upstream aggregator surfaces
 * multiple framings of one event.
 *
 * Stable: ordering and primary-picking delegate to
 * `mergeClustersByLlmHints`, which selects the earliest-published
 * member as the merged primary. Non-merged clusters pass through in
 * input order.
 */
export function mergeBySameSourceTitleSimilarity(
  clusters: Cluster[],
  threshold: number = DEFAULT_THRESHOLD,
  windowSecs: number = PUBLISHED_AT_WINDOW_SECS,
): Cluster[] {
  if (clusters.length < 2) return clusters;

  interface Pre {
    sourceName: string;
    tokens: Set<string>;
    publishedAt: number;
  }
  const pre: Pre[] = clusters.map((c) => {
    const sourceTokens = sourceNameTokens(c.primary.source_name);
    return {
      sourceName: c.primary.source_name,
      tokens: tokenize(c.primary.title, sourceTokens),
      publishedAt: c.primary.published_at,
    };
  });

  // Union-find over cluster indices so transitively-similar clusters
  // collapse into one group (A~B and B~C must produce {A,B,C}).
  const parent: number[] = pre.map((_, i) => i);
  const find = (i: number): number => {
    let cursor = i;
    while (parent[cursor] !== cursor) {
      const next = parent[cursor];
      if (next === undefined) break;
      const nextParent = parent[next];
      if (nextParent === undefined) break;
      parent[cursor] = nextParent;
      cursor = nextParent;
    }
    return cursor;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < pre.length; i++) {
    const a = pre[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < pre.length; j++) {
      const b = pre[j];
      if (b === undefined) continue;
      if (a.sourceName !== b.sourceName) continue;
      if (Math.abs(a.publishedAt - b.publishedAt) > windowSecs) continue;
      if (jaccard(a.tokens, b.tokens) < threshold) continue;
      union(i, j);
    }
  }

  // Group by root, then hand the index groups to the existing merger.
  const groups = new Map<number, number[]>();
  for (let i = 0; i < pre.length; i++) {
    const root = find(i);
    const existing = groups.get(root);
    if (existing === undefined) groups.set(root, [i]);
    else existing.push(i);
  }

  const dedupGroups: number[][] = [];
  for (const indices of groups.values()) {
    if (indices.length >= 2) dedupGroups.push(indices);
  }
  if (dedupGroups.length === 0) return clusters;

  return mergeClustersByLlmHints(clusters, dedupGroups);
}
