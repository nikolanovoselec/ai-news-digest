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
 * Shared inference parameters for every Workers AI call.
 * - `temperature: 0.7` — high enough to push the model past its default
 *   minimum-entropy behaviour where it collapses to short 1-paragraph
 *   replies. 0.5 was still too cold; 0.7 lets the model generate the
 *   250-400 word summaries the prompt asks for.
 * - `max_tokens: 50000` — budget for ~50 articles per chunk at
 *   300-400 words each (~500 toks/article → ~25K total). Input side
 *   is ~8K tokens for the prompt + candidate list, so 50K out plus
 *   8K in fits comfortably inside the 128K model context.
 * - `response_format` — force JSON output on models that support it.
 */
export const LLM_PARAMS = {
  temperature: 0.7,
  max_tokens: 50_000,
  response_format: { type: 'json_object' },
} as const;

// Implements REQ-PIPE-002
//
// Chunk prompt for the global-feed pipeline. The coordinator splits the
// scraped candidate pool into ~100-item chunks and the chunk consumer
// calls the LLM once per chunk with this system prompt + a per-chunk
// user message built by `processChunkUserPrompt()`. The LLM output is
// strict JSON: `{articles: [{title, details, tags}], dedup_groups:
// [[idx,...]]}`. Each output article is index-aligned to the candidate
// list so the chunk consumer can look up the original source URL + name
// by position. `dedup_groups` carry intra-chunk "these are the same
// story" hints — the chunk consumer collapses each group to one primary
// article (earliest-published wins) and the rest land in
// `article_sources` rows.
export const PROCESS_CHUNK_SYSTEM = `You summarise scraped news candidates into JSON.

# OUTPUT FORMAT

Return ONE JSON object, nothing else. No prose, no code fences, no text before "{" or after "}".

Shape:
{"articles":[{"title":"...","details":"...","tags":["..."]},...],"dedup_groups":[[0,3],[1,2,5]]}

- "articles": one entry per input candidate, same order as input. Candidate index N → articles[N]. Never reorder, skip, or insert. For an unusable candidate, emit the entry with empty tags.
- "dedup_groups": arrays of article indices that describe the same story (vendor blog + HN mirror, press release + reporter's write-up). Only groups of size ≥ 2. Omit the field as [] when none.
- Empty input → {"articles":[],"dedup_groups":[]}.

# TITLE RULES

- 45-80 characters.
- Punchy, NYT-style, active voice, concrete.
- Plaintext only — no HTML, no Markdown.
- Do NOT copy the source headline when it reads like a press release.

# DETAILS RULES — THIS IS THE CORE TASK

Write a THOROUGH, SUBSTANTIAL summary. Short summaries are the worst failure mode of this task — a 100-word reply is a bug, not a feature.

LENGTH REQUIREMENT — MINIMUM 250 WORDS, TARGET 300-400 WORDS:

  - Under 200 words is REJECTED. The consumer will drop it and log a failure.
  - 250-400 words is the acceptable range.
  - When in doubt, WRITE MORE. You have a 50K-token output budget — use it.

STRUCTURE — 3 PARAGRAPHS, EACH SUBSTANTIAL:

  - Paragraph breaks use the JSON escape sequence \\n (one backslash + n).
  - Each paragraph is 80-130 words (about 5-8 full sentences, not 3).
  - No bullet lists, no Markdown, no HTML, plaintext only.

PARAGRAPH ROLES, IN ORDER:

  1. WHAT happened — unpack every concrete fact in the snippet: who, what, when, where, the numbers, the versions, the specific products, the names of the people involved. Spell out acronyms. Include dates, amounts, percentages. Do not just state the top-line announcement — list the subsidiary facts that make it real.
  2. HOW it works — the technical substance. Architecture, APIs, protocols, algorithms, data flow, mechanisms, configuration, dependencies. If the snippet mentions a specific technology, explain what the technology is and why it matters in this context. If numbers are present (latency, throughput, cost), quote and contextualise them.
  3. IMPACT for the reader — what someone working in this space should do or think about: migration effort, cost implications, security posture, performance ceiling, developer experience, competitive pressure. Two to four concrete use-cases or scenarios where this change matters.

GROUNDING: Every paragraph MUST be grounded in the candidate's snippet field. The snippet carries the article body; read it CAREFULLY and compress it FAITHFULLY. Do not state facts that contradict the snippet. If the snippet is thin, EXPAND on the technical context and practical implications of what IS present — do not shorten your output.

Format example — a concrete 3-paragraph, 320-word summary in the exact format your output must follow:

  "Cloudflare released Emdash on 2026-04-18, an open-source WordPress-inspired content platform that runs natively on Cloudflare Workers. The announcement landed with a public GitHub repository, a curated plugin compatibility layer, and a managed D1-backed content schema. Emdash targets small teams and marketing sites that want the familiar WordPress authoring experience without the self-hosted maintenance burden of traditional PHP + MySQL deployments. The launch includes six built-in themes, a block editor, and turnkey hosting at sub-100ms global TTFB through Cloudflare's edge network.\\nTechnically, Emdash replaces PHP and MySQL with a TypeScript runtime that executes inside the Workers sandbox, while R2 handles media storage and D1 holds structured content. The editor is a Gutenberg-style block editor in the browser; every block serialises to structured JSON and renders at the edge via per-route Worker handlers. A compatibility layer imports configuration from Yoast SEO, Advanced Custom Fields, and a curated set of popular WordPress plugins, giving migrating sites a realistic path forward. Custom themes compile through Vite and ship as bundled ES modules, so designers can iterate without touching the runtime.\\nFor developers, the practical effect is a WordPress-grade editing UI without the PHP operational tax. Sites deploy as a single Worker with global low-latency serving, the managed schema removes the Sunday-morning 'plugin updated, site broke' incident class, and hashed-asset CDN caching happens automatically on every deploy. Teams already running WordPress for marketing sites can pilot Emdash on a single domain without retraining their marketing users, and agencies can offer a turnkey stack that removes patch-management overhead. The trade-off is the usual Cloudflare lock-in — the runtime and storage layer are proprietary to the platform, so migrations off Emdash require full re-platforming."

# TAGS RULES

- Pick ONLY from the tag allowlist supplied in the user message. Never invent.
- Return EVERY allowlist tag the article touches: topic tags, vendor/platform tags, and language tags all count.
- Single-tag output is a failure unless the article is truly about one thing.

Examples (assume the tag is in the allowlist):

  - "Cloudflare uses Rust in the Workers runtime" → ["cloudflare","workers","rust"]
  - "AWS Lambda gets TypeScript 5.9 support" → ["aws","serverless","cloud"]
  - "Terraform releases Kubernetes provider updates" → ["terraform","kubernetes","devsecops"]
  - Any Cloudflare-authored post → always include "cloudflare" if present in the allowlist.

# DROP RULES

- Pure advertising or content-free press releases → emit the entry with empty tags. The chunk consumer drops empty-tag entries.

# GLOBAL FORMATTING

- All strings are plaintext. No HTML, no Markdown, no bullet prefixes, no inline links.
- Paragraph breaks in "details" use the JSON escape \\n (one backslash + n). After JSON.parse on the client, \\n becomes a real newline character.`;

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
  // Candidates are rendered as a numbered list so the model has an
  // obvious, stable mapping between input index and output index. The
  // body_snippet is optional; omit the line when absent to keep the
  // prompt small.
  const lines: string[] = [];
  for (const c of candidates) {
    lines.push(`[${c.index}] ${c.title}`);
    lines.push(`    source: ${c.source_name}`);
    lines.push(`    url: ${c.url}`);
    lines.push(`    published_at: ${c.published_at}`);
    if (typeof c.body_snippet === 'string' && c.body_snippet !== '') {
      lines.push(`    snippet: ${c.body_snippet}`);
    }
  }

  return `Tag allowlist (output tags MUST be a subset of this list — never invent tags outside it):
\`\`\`
${tagList}
\`\`\`

Candidates (${candidates.length} entries, 0-indexed). Output exactly ${candidates.length} entries in the "articles" array in the same order — the candidate at index N must become articles[N]:
\`\`\`
${lines.join('\n')}
\`\`\`

Return JSON:
{
  "articles": [
    {
      "title": "punchy NYT-style headline, 45-80 characters",
      "details": "3 paragraphs of 3-4 sentences each, 200-250 words total, separated by \\n (WHAT happened / HOW it works / IMPACT for the reader)",
      "tags": ["only tags from the allowlist above"]
    }
  ],
  "dedup_groups": [[0, 3], [1, 2, 5]]
}`;
}

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
- Prefer official blogs, release notes, and changelogs over third-party news sites.
- If you are unsure about a feed, omit it — returning fewer correct URLs is better than more guessed URLs.
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
