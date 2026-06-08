// Implements REQ-DISC-001
// Implements REQ-DISC-005
//
// Centralised LLM prompts for the two calls the product makes:
//   1. Global-feed chunk processing — summarise and tag a batch of scraped candidates.
//   2. Source discovery — suggest authoritative RSS/Atom/JSON feeds for a tag.
//
// Kept in one file so iteration is easy, the system/user split is obvious,
// and all user-controlled fencing can be audited in one place. User-supplied
// content (tag names, candidate headlines) is always wrapped in triple-
// backtick fences so the model treats it as data, not instructions — the
// core prompt-injection mitigation for both calls.
//
// Inference parameters are pinned via LLM_PARAMS; a separate retry/model
// layer decides _which_ model runs, but the sampling knobs stay constant
// across calls so outputs remain reproducible.

/**
 * Shared inference parameters across the LLM calls. Temperature and
 * response_format are identical; only `max_tokens` varies per call
 * site (CF-023): chunk processing produces large multi-article
 * payloads, while discovery and rerank produce tiny JSON envelopes.
 *
 * - `temperature: 0.6` — warm enough for the model to pick complete
 *   summaries over minimum-entropy short replies, cool enough for
 *   stable JSON output. 0.7 was working but 0.6 trims variance on
 *   the 100-150 word target.
 * - `response_format` — force JSON output on models that support it.
 */
const LLM_BASE_PARAMS = {
  temperature: 0.6,
  response_format: { type: 'json_object' },
} as const;

/**
 * Chunk-prompt OUTPUT budget. The chunk consumer runs `DEFAULT_MODEL_ID`
 * once per chunk (single-model architecture; no fallback). Model
 * runtimes enforce `prompt_tokens + max_tokens ≤ contextTokens`.
 * The Gemini AI Gateway canary has a much larger context, but the 128K
 * gpt-oss entries remain a useful lower-bound sanity check for rollback.
 * 14K reserves enough headroom for 8 × 100-150 word summaries plus JSON
 * overhead, while reducing the chance that a slow model keeps writing
 * long, expensive rejected-candidate prose. That leaves ~114K tokens for
 * input on 128K rollback models (~399K chars at ~3.5 chars/token), which
 * still comfortably covers the coordinator's greedy chunk packer
 * (`scrape-coordinator.ts:CHUNK_INPUT_CHARS_BUDGET`). Larger-context
 * models simply leave more headroom. User-selected budget models in
 * `MODELS` are never wired here.
 */
export const CHUNK_LLM_PARAMS = {
  ...LLM_BASE_PARAMS,
  max_tokens: 14_000,
} as const;

/**
 * Discovery-prompt budget — output is `{ feeds: [{ url, name, kind }] }`,
 * usually a handful of entries. Same 4K cap as rerank: small JSON
 * envelope, no benefit from the chunk-sized 50K reservation.
 */
export const DISCOVERY_LLM_PARAMS = {
  ...LLM_BASE_PARAMS,
  max_tokens: 4_000,
} as const;

// Implements REQ-PIPE-002
//
// Chunk prompt for the global-feed pipeline. The coordinator splits the
// scraped candidate pool into small chunks (default cap: 8 candidates)
// and the chunk consumer calls the LLM once per chunk with this system
// prompt + a per-chunk user message built by `processChunkUserPrompt()`.
// The LLM output is strict JSON: `{articles: [{index, title, details,
// tags}]}`. Each output article is index-aligned to the candidate list
// so the chunk consumer can look up the original source URL + name by
// echoed `index`; cross-source/cross-chunk duplicate detection happens
// later in finalize + historical dedup.
export const PROCESS_CHUNK_SYSTEM = `You summarise scraped news candidates into JSON.

# OUTPUT FORMAT

Return ONE JSON object, nothing else. No prose, no code fences, no text before "{" or after "}".

Shape:
{"articles":[{"index":N,"title":"...","details":"...","tags":["..."]},...]}

- "articles": EXACTLY one entry per input candidate. If the user message contains N candidates, return N article records. Each entry MUST include its "index" field echoing the input candidate's bracketed index (the [N] in the user message). The consumer aligns output to input BY THIS INDEX, not by position — an entry without a correct "index" is dropped, so every summary you write is lost.
- Never change an entry's index. "index": 47 means "this entry summarises the candidate that appeared as [47] in the input list". Title, details, and tags in that entry MUST be about THAT specific candidate's URL and snippet — never mix facts across candidates.
- For an unusable, off-topic, or content-free candidate, emit the smallest possible drop record: {"index":N,"title":"","details":"","tags":[]}. Do not spend tokens summarising candidates that will be dropped.
- DO NOT cluster, group, merge, or suppress duplicate-looking candidates. Every input candidate gets its own entry in "articles". Cross-source duplicate detection happens in a later pipeline step that sees the full corpus — your job here is summarisation only.
- Empty input → {"articles":[]}.

# TITLE RULES

- 45-80 characters.
- Punchy, NYT-style, active voice, concrete.
- Plaintext only — no HTML, no Markdown.
- Prefer the source headline's concrete nouns and named product/protocol terms. Rewrite only when the headline is vague, clickbait, or reads like a press release.

# DETAILS RULES — THIS IS THE CORE TASK

- Write 100-150 words for every non-drop article; aim for 120-135.
- Never ship under 100 words. If the snippet is thin, add grounded WHAT/HOW/IMPACT facts from that same snippet; do not pad or repeat.
- Never exceed 150 words.
- Use 2 short paragraphs for simple stories; use 3 only when there is real technical substance.
- Paragraph breaks use the JSON escape sequence \\n (one backslash + n).
- Each paragraph has 2-4 full sentences. No bullets, Markdown, or HTML.
- Paragraph roles: WHAT happened; HOW it works; optional IMPACT for cost, migration, security, performance, or concrete use.
- Every claim must be traceable to the candidate snippet. Do not add outside facts or fuse unrelated article sections into one claim.
- Preserve the article's distinctive mechanism, named product/protocol, architecture component, or specific number.

# TAGS RULES

- Pick ONLY from the tag allowlist supplied in the user message. Never invent.
- Return EVERY allowlist tag the article touches: topic, vendor/platform, language, security, and cloud tags all count.
- Single-tag output is a failure unless the article is truly about one thing.
- Any Cloudflare-authored post → include "cloudflare" if present in the allowlist.

# DROP RULES

- Pure advertising, off-topic posts, or content-free press releases → emit {"index":N,"title":"","details":"","tags":[]}.
- The chunk consumer drops empty-tag entries. Do not write a title or details for a dropped candidate; those tokens are wasted and increase cost.

# GLOBAL FORMATTING

- All strings are plaintext. No HTML, no Markdown, no bullet prefixes, no inline links.
- Paragraph breaks in "details" use the JSON escape \\n (one backslash + n). After JSON.parse on the client, \\n becomes a real newline character.`;

// Triple-backtick runs in any candidate-supplied field would break the
// fenced block the candidate is rendered inside, allowing the article
// to escape the data section and inject into the structural prompt.
// Every field interpolated into a fenced block is sanitized through
// this helper, with a per-field length cap as defense-in-depth (upstream
// fetch/feed code already enforces some caps; the prompt builder must
// not trust that). Newlines are preserved (LLMs need them); only the
// fence-escaping triple-backtick sequence is collapsed (CF-032).
const TITLE_MAX_CHARS = 300;
const SOURCE_NAME_MAX_CHARS = 100;
const URL_MAX_CHARS = 1000;
// Sized strictly above the upstream `SNIPPET_CAP` (15000 in
// article-fetch.ts) so this layered cap remains meaningful — an
// upstream regression that produced a 30K-char snippet would still
// be clamped here. Defense-in-depth, per CF-013.
const BODY_SNIPPET_MAX_CHARS = 16000;

function sanitizePromptField(value: string, maxChars: number): string {
  const stripped = value.replace(/`{3,}/g, '[code-block]');
  return stripped.length > maxChars
    ? `${stripped.slice(0, maxChars)}…`
    : stripped;
}

/**
 * Build the user message for a single chunk-processing call. Wraps the
 * tag allowlist and the numbered candidate list in triple-backtick
 * fences so the model treats untrusted candidate text as data. The
 * allowlist is the union of `DEFAULT_HASHTAGS` + discovered-tag KV keys
 * at the time of fan-out; the chunk consumer validates every output tag
 * against this same set so a hallucinated tag never reaches D1.
 */
export function processChunkUserPrompt(
  candidates: Array<{
    index: number;
    title: string;
    url: string;
    source_name: string;
    published_at: number;
    body_snippet?: string;
  }>,
  allowedTags: readonly string[],
): string {
  const tagList = allowedTags.join(', ');
  const lines: string[] = [];
  for (const c of candidates) {
    lines.push(`[${c.index}] ${sanitizePromptField(c.title, TITLE_MAX_CHARS)}`);
    lines.push(`    source: ${sanitizePromptField(c.source_name, SOURCE_NAME_MAX_CHARS)}`);
    lines.push(`    url: ${sanitizePromptField(c.url, URL_MAX_CHARS)}`);
    lines.push(`    published_at: ${c.published_at}`);
    if (typeof c.body_snippet === 'string' && c.body_snippet !== '') {
      lines.push(`    snippet: ${sanitizePromptField(c.body_snippet, BODY_SNIPPET_MAX_CHARS)}`);
    }
  }

  return `Tag allowlist (output tags MUST be a subset of this list — never invent tags outside it):
\`\`\`
${tagList}
\`\`\`

Candidates (${candidates.length} entries, 0-indexed). Output exactly ${candidates.length} entries in the "articles" array — one record for every bracketed candidate index, including drop records. Each entry MUST carry an "index" field that matches the bracketed [N] of the candidate it summarises — the server aligns your output to the input BY THAT FIELD, not by position, so an entry without a correct "index" is silently dropped:
\`\`\`
${lines.join('\n')}
\`\`\`

Return JSON:
{
  "articles": [
    {
      "index": 0,
      "title": "punchy NYT-style headline, 45-80 characters, about candidate [0] specifically",
      "details": "2 paragraphs of 2-4 sentences each, 100-150 words total, ideally 120-135 words, separated by \\n (WHAT happened / HOW it works / optional IMPACT for the reader) — grounded in candidate [0]'s snippet only, every claim traceable to a single passage, distinctive mechanism named; for dropped candidates use an empty string",
      "tags": ["only tags from the allowlist above"]
    }
  ]
}`;
}

// REQ-PIPE-003: cross-tick semantic dedup runs against Cloudflare
// Vectorize using bge-base-en-v1.5 embeddings. The previous
// FINALIZE_DEDUP_SYSTEM / finalizeDedupUserPrompt / FINALIZE_LLM_PARAMS
// trio was removed 2026-05-06 — independent LLM-rewritten summaries of
// the same event share too little vocabulary for any LLM dedup call to
// catch reliably at scale, and the embedding-based approach gives
// deterministic same-event collapse with zero per-tick LLM cost. See
// AD33 (Vectorize + embeddings) for evidence.

export const DISCOVERY_SYSTEM = `You are a JSON API. You suggest authoritative, stable, publicly accessible RSS/Atom/JSON feed URLs for a given technology or topic, and output JSON.

CRITICAL OUTPUT CONTRACT:
- Your entire response MUST be a single valid JSON object.
- DO NOT write any text before the opening "{" or after the closing "}".
- DO NOT wrap the JSON in \`\`\` code fences.
- DO NOT write "Here is the JSON" or any prose at all.
- If you have no confident suggestions, output {"feeds": []}.

The object shape is always:
{"feeds":[{"name":"string","url":"string","kind":"rss"}]}

Discovery rules:
- Only suggest feeds you are highly confident exist at the given URL. Do NOT guess.
- Prefer official blogs, release notes, and changelogs when they exist — they are the strongest signal for a technical topic.
- When no authoritative first-party feed exists (typical for consumer brands, products, or non-technical topics), include the Google News query-RSS for the topic as a fallback. It always returns a valid RSS 2.0 feed with recent items aggregated across major publishers. Format: {"name":"Google News: <topic>","url":"https://news.google.com/rss/search?q=<topic>&hl=en-US&gl=US&ceid=US:en","kind":"rss"}. Substitute <topic> with the tag itself, URL-encoded if it contains characters outside [a-z0-9-].
- If you are unsure about a feed AND the Google News fallback also doesn't apply, omit it — returning fewer correct URLs is better than more guessed URLs.
- "kind" is one of "rss", "atom", or "json".`;

/**
 * Build the user message for the source-discovery call. The tag is fenced
 * with triple backticks so adversarial tag content cannot steer the model
 * (REQ-DISC-005). Validation of returned URLs happens independently of the
 * LLM response — a malicious suggestion cannot bypass the SSRF filter.
 */
export function discoveryUserPrompt(tag: string): string {
  return `Topic:
\`\`\`
#${tag}
\`\`\`

Return up to 5 authoritative feed URLs as:
{
  "feeds": [
    { "name": "Human-readable name", "url": "https://...", "kind": "rss" }
  ]
}

"kind" is one of "rss" | "atom" | "json". If you have no confident suggestions, return { "feeds": [] }.`;
}
