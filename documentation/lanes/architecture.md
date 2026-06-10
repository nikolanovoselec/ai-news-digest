# Architecture

System overview, component map, and request lifecycles for `news-digest`.

**Audience:** Developers, Operators

This document describes **what** the system is and **how requests flow through it**. Implementation rationale ("why this code looks the way it does") lives in source comments. Endpoint contracts live in [`api-reference.md`](api-reference.md). Environment and bindings live in [`configuration.md`](configuration.md). Architectural decisions live in [`decisions/README.md`](../decisions/README.md). Product intent lives in [`sdd/`](../../sdd/).

## Contents

- [1. Overview](#1-overview)
- [2. Components](#2-components)
- [3. Repository Layout](#3-repository-layout)
- [4. Source Module Map](#4-source-module-map)
- [5. Request Lifecycles](#5-request-lifecycles)
- [6. Data Flow](#6-data-flow)
- [7. Cross-cutting Concerns](#7-cross-cutting-concerns)
- [8. Build and Deploy](#8-build-and-deploy)
- [Design System Tokens](#design-system-tokens)
- [Related Documentation](#related-documentation)

---

## 1. Overview

`news-digest` is a single Cloudflare Worker serving an Astro-rendered web app. A 4-hour scrape run scrapes a curated set of RSS/Atom/JSON feeds, summarises new candidates through the default LLM route (`dynamic/news_digest` via Cloudflare AI Gateway Dynamic Routing), and writes them to the shared **article pool**. Per-user dashboards filter the pool by the user's hashtags - there are no per-user LLM calls.

Separate cron triggers dispatch email every 5 minutes and drain pending feed-discovery jobs every 10 minutes on a 2-minute offset. A 03:00 UTC cron purges articles older than 14 days (starred articles exempt).

<!-- doc-allow-element: AD46 diagram-section exemption (component map) -->
```
┌────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker (Astro)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │ Page handler │  │ API handlers │  │  Cron + Queue dispatch │    │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘    │
│         └──────────────┬──┴───────────────────┬──┘                 │
│                        ▼                      ▼                    │
│                ┌──────────────┐       ┌──────────────┐             │
│                │      D1      │       │ Cloudflare   │             │
│                │ (consistent) │       │    Queues    │             │
│                └──────────────┘       └──────┬───────┘             │
│                                              ▼                     │
│                ┌──────────────┐       ┌──────────────┐             │
│                │      KV      │       │ AI Gateway   │             │
│                │  (cache)     │       │ + Workers AI │             │
│                └──────────────┘       └──────────────┘             │
└────────────────────────────────────────────────────────────────────┘
                  │                                        │
                  ▼                                        ▼
          GitHub / Google                              Resend
           (federated OAuth)                       (digest emails)
```

Implements [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract).

## 2. Components

| Component | Role |
|---|---|
| Astro Worker | Serves all HTML pages and JSON APIs in the Cloudflare Workers runtime |
| Cron Triggers | 4-hour scrape, daily 03:00 UTC retention, 5-minute email, 10-minute discovery |
| Queue Consumers | `SCRAPE_COORDINATOR`, `SCRAPE_CHUNKS`, `SCRAPE_FINALIZE`, `DEDUP_SWEEP`, `PIPELINE_JOBS` |
| D1 | Strongly-consistent storage: users, articles, scrape_runs, refresh_tokens, pending_discoveries |
| KV | Edge-cached `sources:{tag}`, headline cache, per-URL fetch-health counters, rate-limit counters |
| AI Gateway + Workers AI | Gateway-backed LLM calls for summaries/discovery/rerank; Workers AI embeddings for same-story dedup |
| Vectorize | 768-dim cosine index over every surviving article's embedding; queried per article on ingest and on operator-driven historical sweeps |
| Resend | Transactional email transport for digest-ready notifications |
| Federated OAuth | GitHub and Google sign-in (at least one provider must be configured) |

## 3. Repository Layout

| Path | Contents |
|---|---|
| `src/middleware/` | Astro middleware: session loading, CSRF/Origin check, security headers, admin gate |
| `src/lib/` | Shared library code: crypto, DB helpers, LLM helpers, sources, dedupe, email, rate limit, tz |
| `src/pages/` | Astro page components (HTML routes) |
| `src/pages/api/` | JSON API routes (see [`api-reference.md`](api-reference.md) for contracts) |
| `src/components/` | Astro UI components |
| `src/layouts/` | Page layout shells |
| `src/queue/` | Queue consumers (coordinator, chunk, finalize, dedup-sweep, pipeline-jobs, cleanup) |
| `src/scripts/` | Client-side TypeScript modules (mirrored to `public/scripts/` at build time) |
| `src/styles/` | Global CSS and design tokens |
| `public/` | Static assets, manifest, runtime client-script bundles |
| `migrations/` | D1 schema migrations |
| `scripts/` | Build tooling (PWA icon generation, worker handler merge) |
| `tests/` | Vitest suites; run via `@cloudflare/vitest-pool-workers` |

## 4. Source Module Map

Every source file annotates the REQ-IDs it implements via `// Implements REQ-X-NNN` comments. The tables below summarise role; refer to source for the full contract.

### 4.1 Middleware

| Path | Role | Implements |
|---|---|---|
| `src/middleware/index.ts` | Astro middleware entry; chains the security-headers handler | [REQ-OPS-003](../../sdd/spec/observability.md#req-ops-003-content-security-policy-on-every-response) |
| `src/middleware/auth.ts` | `loadSession` - access JWT verify and refresh-token rotation; cookie helpers | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation), [REQ-AUTH-008](../../sdd/spec/authentication.md#req-auth-008-refresh-token-rotation-and-per-device-logout) |
| `src/middleware/origin-check.ts` | Rejects state-changing requests whose `Origin` does not match `APP_URL` | [REQ-AUTH-003](../../sdd/spec/authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints) |
| `src/middleware/security-headers.ts` | Stamps CSP, HSTS, and related headers on every response | [REQ-OPS-003](../../sdd/spec/observability.md#req-ops-003-content-security-policy-on-every-response) |
| `src/middleware/admin-auth.ts` | Admin gate for `/api/admin/*`. Baseline: valid session cookie + `ADMIN_EMAIL` match (case-insensitive). Optional Layer 0 (AD29): when `CF_ACCESS_AUD` is set, the request must additionally carry a Cloudflare Access assertion whose `aud` claim matches the configured value; the `exp` claim is validated server-side as defence-in-depth ([AD44](../decisions/README.md#ad44-cloudflare-access-jwt-exp-validation-signature-still-trusted-from-the-perimeter)). | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) AC 8, AC 8a |

### 4.2 Libraries (`src/lib/`)

| Path | Role | Implements |
|---|---|---|
| `canonical-url.ts` | URL canonicalization for cross-source dedup | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `etld.ts` | Naive eTLD+1 helper (`etldPlusOne`, `sameVendor`): extracts the registrable domain for same-publisher detection. Aggregator hosts (`news.google.com`) always return `false` from `sameVendor` - they carry no publisher identity. Covers dominant TLDs; does not use the full Public Suffix List. | [REQ-PIPE-012](../../sdd/spec/generation.md#req-pipe-012-same-story-matching-policy-variants) AC 2 |
| `crypto.ts` | base64url codec, constant-time HMAC compare, cookie reader | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider), [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation) |
| `db.ts` | D1 wrapper with FK pragma | (shared) |
| `email.ts` | Resend renderer and transport | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content), [REQ-MAIL-002](../../sdd/spec/email.md#req-mail-002-non-blocking-email-failure), [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `email-html.ts` | Typed HTML builders for the digest email renderer - centralises `escapeHtml` and `headlineRow` so every interpolated value is escaped by default | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content) |
| `email-data.ts` | Per-user D1 read helpers for the email dispatcher | [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `email-dispatch.ts` | 5-minute cron hook; per-tz two-phase D1 strategy with bucket isolation | [REQ-MAIL-002](../../sdd/spec/email.md#req-mail-002-non-blocking-email-failure), [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `hashtags.ts` | Parse user hashtag list from JSON-encoded D1 column | [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content) |
| `jwt-secret.ts` | Runtime guard rejecting `OAUTH_JWT_SECRET` shorter than 32 bytes | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation) |
| `errors.ts` | Closed `ErrorCode` enum and sanitized response builder | [REQ-OPS-002](../../sdd/spec/observability.md#req-ops-002-sanitized-error-surfaces) |
| `generate.ts` | LLM response payload extraction and JSON parsing | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract) |
| `llm-json.ts` | Single LLM-call entrypoint; routes direct Gateway models and AI Gateway Dynamic Routes (`dynamic/*`) through `AI_GATEWAY_URL`, runs `DEFAULT_MODEL_ID` once, and centralises token-cost accounting | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract) |
| `headline-cache.ts` | KV-backed shared headline cache | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `log.ts` | Structured JSON log emitter with closed `LogEvent` enum | [REQ-OPS-001](../../sdd/spec/observability.md#req-ops-001-structured-json-logging) |
| `default-hashtags.ts` | Seed hashtag list for new accounts | [REQ-SET-008](../../sdd/spec/settings.md#req-set-008-hashtag-persistence-validation-and-defaults) |
| `models.ts` | `MODELS` catalog, `DEFAULT_MODEL_ID` (`dynamic/news_digest`, an AI Gateway Dynamic Routing route; see [AD57](../decisions/README.md#ad57-ai-gateway-dynamic-route-for-pipeline-model-control)), and token-cost estimator | [REQ-PIPE-006](../../sdd/spec/generation.md#req-pipe-006-scrape_runs-aggregation-surfaces-stats-history-and-in-flight-progress), [REQ-SET-004](../../sdd/spec/settings.md#req-set-004-model-selection) |
| `google-jwks.ts` | RS256 signature verification for Google `id_token`s via JWKS (`https://www.googleapis.com/oauth2/v3/certs`); caches the key set for 1 hour in KV (`oidc:jwks:google`) to bound isolate-level fetch cost (CF-013) | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `oauth-providers.ts` | GitHub + Google adapters with id_token validation | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `oauth-errors.ts` | OAuth error code allowlist and sanitizer | [REQ-AUTH-004](../../sdd/spec/authentication.md#req-auth-004-oauth-error-surfacing) |
| `prompts.ts` | LLM system prompts for chunk processing and source discovery; compacts long article bodies into extractive high-signal prompt context before summary calls | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract), [REQ-PIPE-022](../../sdd/spec/generation.md#req-pipe-022-chunk-prompt-input-compaction), [REQ-DISC-007](../../sdd/spec/discovery.md#req-disc-007-per-tag-feed-discovery-execution-and-persistence) |
| `rate-limit.ts` | KV window-counter rate limiter for auth routes, mutation routes, and authenticated polling endpoints | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) AC 9 |
| `session-jwt.ts` | HMAC-SHA256 sign/verify for the access-token JWT | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation) |
| `refresh-tokens.ts` | 30-day opaque refresh-token storage in D1 with rotation and reuse detection | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation), [REQ-AUTH-008](../../sdd/spec/authentication.md#req-auth-008-refresh-token-rotation-and-per-device-logout) |
| `digest-today.ts` | Dashboard payload loader (`loadTodayPayload`) and next-cron-tick calculator (`computeNextScrapeAt`); factored out of the API route so server-rendered pages call it directly without cross-module route imports | [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest) |
| `slug.ts` | Deterministic ASCII slug generation | [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest) |
| `sources.ts` | Source adapters (RSS/Atom/JSON) and fan-out coordinator; `itemToHeadline` applies a per-item `<source>` element override so Google News items carry the underlying publisher name (e.g. "Help Net Security") and only promotes `<source url>` when it is article-shaped, keeping homepage/category URLs as Google News item links | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `prefer-direct-source.ts` | Resolve aggregator URLs (e.g., Google News) to underlying publisher and merge tag-of-discovery state | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `blocked-publishers.ts` | Hard publisher blocklist. Drops off-topic headlines (financial / stock-pump aggregators surfaced by ticker-matching tags) at the coordinator before clustering, embedding, or LLM processing. Two signals: host suffix match (`BLOCKED_HOSTS`) and RSS source-name token match (`BLOCKED_NAME_TOKENS`), the latter needed because Google News redirect envelopes hide the real host. | [REQ-PIPE-011](../../sdd/spec/generation.md#req-pipe-011-candidate-filtering-rules) AC 3 |
| `paragraph-split.ts` | Normalise LLM-produced prose into a paragraph array for the article-detail view | [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering) |
| `curated-sources.ts` | Static registry of curated feeds; exports `googleNewsSourceForTag` (per-tag GN query-RSS synthesis) and `hasCuratedGoogleNews` (skip-guard for the coordinator baseline pass) | [REQ-PIPE-004](../../sdd/spec/generation.md#req-pipe-004-curated-source-registry-with-50-feeds-spanning-the-21-system-tags), [REQ-PIPE-019](../../sdd/spec/generation.md#req-pipe-019-google-news-query-rss-long-tail-backstop) |
| `dedupe.ts` | Canonical-URL clustering (first pass over a chunk's candidates) | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `bidirectional-dedup.ts` | Shared per-match dedup classifier (`classifyMatchPair`). Encapsulates same-vendor penalty, high-confidence band, time-window gate, equal-time ULID tie-break, and direction flag. Per-consumer outer control flow stays at each call site. See [AD43](../decisions/README.md#ad43-shared-per-match-dedup-classifier-outer-control-flow-stays-per-consumer). | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract), [REQ-PIPE-009](../../sdd/spec/generation.md#req-pipe-009-llm-re-rank-pass-for-borderline-same-story-candidates) |
| `embeddings.ts` | bge-base-en-v1.5 embedding helpers: input builder (`source_snippet` preferred, falls back to `details_json`; length-capped), cosine similarity, threshold parser, time-window parser, same-vendor penalty parser, batch caller for the AI binding | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `dedup-rerank.ts` | LLM same-event judgment for borderline cosine pairs: rerank-floor parser, prompt builder + narrow-JSON parser, batched multi-pair call (cap 15 per round-trip, AD48) that returns per-pair same-event verdicts (conservative all-false on parse failure). Used by both the per-tick finalize pass and the historical re-run sweep. | [REQ-PIPE-009](../../sdd/spec/generation.md#req-pipe-009-llm-re-rank-pass-for-borderline-same-story-candidates) |
| `dedup-watermark.ts` | KV-backed auto-sweep watermark (`dedup:auto_sweep_watermark`); clears on re-embed and defaults missing state to no skip. | [REQ-PIPE-009](../../sdd/spec/generation.md#req-pipe-009-llm-re-rank-pass-for-borderline-same-story-candidates) |
| `finalize-merge.ts` | `pickWinner`, `buildMergeStatements`, and `mergeAsAltSource` (existing-article-wins variant used by the semantic-dedup pass and the historical re-run sweep) | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `scrape-run.ts` | `scrape_runs` lifecycle helpers (`running` → `ready` / `failed`) and additive token/cost/article counter accumulation via `addChunkStats` | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-PIPE-006](../../sdd/spec/generation.md#req-pipe-006-scrape_runs-aggregation-surfaces-stats-history-and-in-flight-progress), [REQ-PIPE-015](../../sdd/spec/generation.md#req-pipe-015-chunk-processing-robustness), [REQ-PIPE-016](../../sdd/spec/generation.md#req-pipe-016-scrape_runs-idempotency-and-stuck-run-cleanup), [REQ-PIPE-020](../../sdd/spec/generation.md#req-pipe-020-chunk-tag-validation-guardrails) |
| `ssrf.ts` | SSRF denylist filter - rejects non-HTTPS, private, loopback, link-local, CGNAT, and metadata-host destinations; used by both discovery URL validation and article body fetching | [REQ-DISC-005](../../sdd/spec/discovery.md#req-disc-005-discovery-prompt-injection-protection), [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `safe-href.ts` | Render-time https-scheme guard for `href` attributes; returns `'#'` for any non-https or unparseable URL from D1 (CF-021 render-time defense-in-depth) | [REQ-DISC-005](../../sdd/spec/discovery.md#req-disc-005-discovery-prompt-injection-protection) |
| `article-fetch.ts` | Body-text extraction from candidate article HTML | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `articles-repo.ts` | Repository layer for the `articles` table: batched `canonical_url` IN-clause lookups, write helpers for `articles` + `article_sources` + `article_tags`, and `updateChunkCount` for `scrape_runs` progress | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `concurrency.ts` | Bounded-concurrency `mapConcurrent` helper | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `queue-handler.ts` | Shared queue-batch envelope: per-message try/ack/retry loop driven by `env.QUEUE_MAX_RETRIES` (set in `wrangler.toml [vars]`), optional terminal-failure hook (CF-007) | (shared infrastructure) |
| `json-string-array.ts` | Defensive parser for D1 columns storing `string[]` as JSON | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content), [REQ-SET-008](../../sdd/spec/settings.md#req-set-008-hashtag-persistence-validation-and-defaults) |
| `html-text.ts` | HTML entity decode and tag-stripping for LLM prompts | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `fetch-policy.ts` | Centralised feed and article fetch timeouts and size caps | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `types.ts` | Shared cross-module TypeScript types | (shared) |
| `tz.ts` | IANA timezone helpers (local-date / local-midnight conversions) | [REQ-SET-003](../../sdd/spec/settings.md#req-set-003-scheduled-digest-time-with-timezone), [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `optional-prop.ts` | Conditional-property spread helper for `exactOptionalPropertyTypes` | (shared) |
| `ulid.ts` | 26-char Crockford base32 ULID generator | [REQ-PIPE-006](../../sdd/spec/generation.md#req-pipe-006-scrape_runs-aggregation-surfaces-stats-history-and-in-flight-progress) |
| `system-user.ts` | Sentinel user-id constants (`__system__`, `__e2e__`) | [REQ-DISC-003](../../sdd/spec/discovery.md#req-disc-003-self-healing-feed-health-tracking) |
| `title-overlap.ts` | Token-overlap alignment guard for the chunk consumer | [REQ-PIPE-015](../../sdd/spec/generation.md#req-pipe-015-chunk-processing-robustness) |
| `feed-health.ts` | Per-URL fetch-health counter for the self-healing discovery loop | [REQ-DISC-003](../../sdd/spec/discovery.md#req-disc-003-self-healing-feed-health-tracking) |
| `kv/discovery-failures.ts` | KV writer for the discovery failure-counter family | [REQ-DISC-009](../../sdd/spec/discovery.md#req-disc-009-pending-discovery-row-lifecycle) |
| `discovery.ts` | LLM discovery pipeline, pending-discovery cron drain, and row lifecycle closure | [REQ-DISC-001](../../sdd/spec/discovery.md#req-disc-001-per-tag-feed-discovery-queueing-and-pickup), [REQ-DISC-007](../../sdd/spec/discovery.md#req-disc-007-per-tag-feed-discovery-execution-and-persistence), [REQ-DISC-009](../../sdd/spec/discovery.md#req-disc-009-pending-discovery-row-lifecycle) |
| `tag-railing-flip.ts` | Shared FLIP animation helper for the tag railing | [REQ-READ-007](../../sdd/spec/reading.md#req-read-007-tag-railing-reorder-animation) |
| `json-ld.ts` | Safe JSON-LD serializer for `<script type="application/ld+json">` blocks - rewrites every `<`, `>`, and `&` byte to its `\uNNNN` JSON form, defeating all HTML state-transition vectors that could escape the script block | [REQ-OPS-004](../../sdd/spec/observability.md#req-ops-004-crawler-policy-and-public-surface-discoverability) AC 6 |

Watermark details ([REQ-PIPE-009 AC 9](../../sdd/spec/generation.md#req-pipe-009-llm-re-rank-pass-for-borderline-same-story-candidates); sources: `src/lib/dedup-watermark.ts`, `src/pages/api/admin/embed-backfill.ts`): `writeWatermark` records terminal sweep completion, and `clearWatermark` runs on re-embed because cosine geometry changes. Discovery keeps the legacy Google News fallback until the coordinator-owned AD31 path has enough retention-window proof.

### 4.3 Pages and API Routes

Page components (`src/pages/*.astro`) and API handlers (`src/pages/api/**.ts`) - see [`api-reference.md`](api-reference.md) for endpoint contracts (request/response shapes, status codes, auth requirements).

| Path | Role | Implements |
|---|---|---|
| `index.astro` | Public landing page; redirects authenticated users to `/digest` | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `digest.astro` | `/digest` overview grid filtered by user hashtags; empty-state when no matching articles | [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-READ-005](../../sdd/spec/reading.md#req-read-005-empty-dashboard-state) |
| `digest/[id]/[slug].astro` | Article detail view with shared-element morph and read tracking | [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering), [REQ-READ-003](../../sdd/spec/reading.md#req-read-003-read-tracking) |
| `history.astro` | `/history` - day-grouped paginated history with tag filtering | [REQ-HIST-001](../../sdd/spec/history.md#req-hist-001-day-grouped-article-history) |
| `starred.astro` | `/starred` - user's starred articles | [REQ-STAR-002](../../sdd/spec/reading.md#req-star-002-starred-articles-page) |
| `settings.astro` | `/settings` - hashtags, schedule, timezone, model, email toggle, account deletion, stuck-tag rediscovery | [REQ-SET-001](../../sdd/spec/settings.md#req-set-001-unified-first-run-and-edit-flow), [REQ-SET-005](../../sdd/spec/settings.md#req-set-005-email-notification-preference), [REQ-SET-006](../../sdd/spec/settings.md#req-set-006-settings-incomplete-gate), [REQ-SET-007](../../sdd/spec/settings.md#req-set-007-timezone-change-detection), [REQ-AUTH-005](../../sdd/spec/authentication.md#req-auth-005-account-deletion), [REQ-DISC-004](../../sdd/spec/discovery.md#req-disc-004-manual-re-discover-ui-surface) |
| `404.astro`, `500.astro` | Error pages (`noindex`) | [REQ-READ-006](../../sdd/spec/reading.md#req-read-006-empty-error-and-offline-pages) |
| `sitemap.xml.ts` | Dynamic sitemap (public landing only) | [REQ-OPS-004](../../sdd/spec/observability.md#req-ops-004-crawler-policy-and-public-surface-discoverability) |

### 4.4 Layouts, Components, and Client Scripts

| Path | Role | Implements |
|---|---|---|
| `src/layouts/Base.astro` | Root HTML shell - manifest, Apple PWA meta, theme init, View Transitions | [REQ-DES-001](../../sdd/spec/design.md#req-des-001-swiss-minimal-visual-language), [REQ-DES-002](../../sdd/spec/design.md#req-des-002-light-and-dark-mode-with-no-flash), [REQ-PWA-001](../../sdd/spec/pwa.md#req-pwa-001-installable-pwa-manifest), [REQ-PWA-003](../../sdd/spec/pwa.md#req-pwa-003-mobile-first-responsive-layout) |
| `src/components/ThemeToggle.astro` | Sun/moon toggle - `variant="default"` for anonymous pages, `variant="header"` for the authenticated header. CF-021 merged HeaderThemeToggle in. | [REQ-DES-002](../../sdd/spec/design.md#req-des-002-light-and-dark-mode-with-no-flash) |
| `src/components/UserMenu.astro` | Avatar dropdown - theme, history, settings, starred, log out | [REQ-PWA-003](../../sdd/spec/pwa.md#req-pwa-003-mobile-first-responsive-layout), [REQ-STAR-003](../../sdd/spec/reading.md#req-star-003-starred-entry-in-the-user-menu) |
| `src/components/InstallPrompt.astro` | PWA install prompt (Android `beforeinstallprompt`, iOS share-icon note) | [REQ-PWA-001](../../sdd/spec/pwa.md#req-pwa-001-installable-pwa-manifest) |
| `src/components/TagStrip.astro` | Shared tag-railing component | [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-READ-007](../../sdd/spec/reading.md#req-read-007-tag-railing-reorder-animation), [REQ-READ-008](../../sdd/spec/reading.md#req-read-008-tag-railing-scroll-wrap-and-fallback) |
| `src/components/DigestCard.astro` | Article card for the digest grid | [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-STAR-001](../../sdd/spec/reading.md#req-star-001-star-and-unstar-articles) |
| `src/components/AltSourcesModal.astro` | Modal listing alternative sources for an article | [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering) |
| `src/components/StatsWidget.astro` | Four-tile stats widget | [REQ-HIST-002](../../sdd/spec/history.md#req-hist-002-user-stats-widget) |
| `src/scripts/page-effects.ts` | Layout-level client behaviour (tz sync, scroll restore, brand-link, view transitions, single-named-group card promotion). Mirrored to `public/scripts/page-effects.js` (CSP requires external bundles) | [REQ-DES-002](../../sdd/spec/design.md#req-des-002-light-and-dark-mode-with-no-flash), [REQ-DES-003](../../sdd/spec/design.md#req-des-003-deliberate-motion-system), [REQ-PWA-003](../../sdd/spec/pwa.md#req-pwa-003-mobile-first-responsive-layout), [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering), [REQ-SET-007](../../sdd/spec/settings.md#req-set-007-timezone-change-detection) |
| `src/scripts/article-detail.ts` | History-aware back arrow on the article page (star toggle moved to `card-interactions.ts` delegation) | [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering) |
| `src/scripts/alt-sources-modal.ts` | Alt-source picker open/close and responsive desktop anchor (positions below trigger on ≥768 px viewports, centred on mobile). Mirrored to `public/scripts/alt-sources-modal.js` (CSP requires external bundles) | [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering) |
| `src/scripts/card-interactions.ts` | Document-level star-toggle delegation (covers `/digest`, `/starred`, `/history`, and article-detail header) plus tag-disclosure popover bindings. Mirrored to `public/scripts/card-interactions.js` and loaded layout-wide via `Base.astro` (CSP blocks the inline Astro bundle that would otherwise be emitted per-page) | [REQ-STAR-001](../../sdd/spec/reading.md#req-star-001-star-and-unstar-articles), [REQ-READ-001](../../sdd/spec/reading.md#req-read-001-overview-grid-of-todays-digest) |
| `src/scripts/install-prompt.ts` | PWA install-prompt bindings | [REQ-PWA-001](../../sdd/spec/pwa.md#req-pwa-001-installable-pwa-manifest) |
| `src/scripts/theme-toggle.ts` | Delegated `[data-theme-toggle]` handler; updates `data-theme`, storage, cookie, and `theme-color`. Mirrored to `public/scripts/theme-toggle.js` for CSP. | [REQ-DES-002](../../sdd/spec/design.md#req-des-002-light-and-dark-mode-with-no-flash) |
| `src/styles/global.css` | Design tokens, type scale, focus ring, motion system | [REQ-DES-001](../../sdd/spec/design.md#req-des-001-swiss-minimal-visual-language), [REQ-DES-002](../../sdd/spec/design.md#req-des-002-light-and-dark-mode-with-no-flash), [REQ-DES-003](../../sdd/spec/design.md#req-des-003-deliberate-motion-system) |


CSP blocks Astro-emitted inline client bundles, so layout-wide scripts that need runtime event handlers are mirrored to `public/scripts/` and loaded as external files.

### 4.5 Worker, Queue, and Migrations

| Path | Role | Implements |
|---|---|---|
| `src/worker.ts` | Cron + queue dispatch entry - four cron branches, five queue message types. Queue dispatch strips recognised env suffixes before switching handlers. | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-PIPE-005](../../sdd/spec/generation.md#req-pipe-005-fourteen-day-retention-with-starred-exempt-cleanup), [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy), [REQ-DISC-001](../../sdd/spec/discovery.md#req-disc-001-per-tag-feed-discovery-queueing-and-pickup) |
| `src/queue/scrape-coordinator.ts` | Fan-out, freshness filter, eviction pass, Google News backstop synthesis, publisher blocklist filter, chunk dispatch, and dispatch idempotency | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-PIPE-010](../../sdd/spec/generation.md#req-pipe-010-body-fetch-for-thin-feed-snippets), [REQ-PIPE-011](../../sdd/spec/generation.md#req-pipe-011-candidate-filtering-rules), [REQ-PIPE-016](../../sdd/spec/generation.md#req-pipe-016-scrape_runs-idempotency-and-stuck-run-cleanup), [REQ-PIPE-019](../../sdd/spec/generation.md#req-pipe-019-google-news-query-rss-long-tail-backstop), [REQ-PIPE-021](../../sdd/spec/generation.md#req-pipe-021-coordinator-terminal-row-safety), [REQ-DISC-003](../../sdd/spec/discovery.md#req-disc-003-self-healing-feed-health-tracking) |
| `src/queue/scrape-chunk-consumer.ts` | Per-chunk LLM call, retry spend accounting, in-chunk compatibility dedup, article-pool writes, embeddings, Vectorize upsert, completion gate, finalize handoff | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract), [REQ-PIPE-015](../../sdd/spec/generation.md#req-pipe-015-chunk-processing-robustness), [REQ-PIPE-017](../../sdd/spec/generation.md#req-pipe-017-article-pool-ingestion-contract), [REQ-PIPE-020](../../sdd/spec/generation.md#req-pipe-020-chunk-tag-validation-guardrails), [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `src/queue/scrape-finalize-consumer.ts` | Same-story dedupe pass: bidirectional merge (AD41), two-tier cosine band, LLM rerank, auto-sweep enqueue on gate flip. See note below. | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract), [REQ-PIPE-009](../../sdd/spec/generation.md#req-pipe-009-llm-re-rank-pass-for-borderline-same-story-candidates), [REQ-PIPE-012](../../sdd/spec/generation.md#req-pipe-012-same-story-matching-policy-variants), [REQ-PIPE-013](../../sdd/spec/generation.md#req-pipe-013-same-story-cross-tick-automation-and-retention-coupling) |
| `src/queue/dedup-sweep-consumer.ts` | Queue-driven historical-dedup sweep. Each message runs one batch, re-enqueues a continuation, and CAS-guards `dedup_runs` counters against redelivery. Flips status to `'done'`/`'failed'` at the terminal step. Full Vectorize outage stalls rather than advances the cursor - see AC 6. | [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1, AC 6 |
| `src/lib/historical-dedup.ts` | Shared batch primitive (`runHistoricalDedupBatch`). Composite-cursor keyset pagination; bidirectional merge (AD42 - PASS 1 folds `self` into older anchor, PASS 2 absorbs newer matches into `self`); threshold + same-vendor penalty + aggregator-host exemption. | [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1 |
| `src/queue/cleanup.ts` | Daily 3-pass cleanup: retention, stuck-tag prune, orphan-tag KV sweep, orphan-run retirement (force-fails any `scrape_runs` row stuck at `chunk_count = -1` for more than 6 hours so dispatch-crash sentinels surface as failed rather than blocking future force-refresh attempts) | [REQ-PIPE-005](../../sdd/spec/generation.md#req-pipe-005-fourteen-day-retention-with-starred-exempt-cleanup), [REQ-DISC-006](../../sdd/spec/discovery.md#req-disc-006-stuck-tag-retention), [REQ-PIPE-007](../../sdd/spec/generation.md#req-pipe-007-orphan-tag-source-cleanup), [REQ-PIPE-016 AC 3](../../sdd/spec/generation.md#req-pipe-016-scrape_runs-idempotency-and-stuck-run-cleanup) |
| `migrations/0001_initial.sql` | Pre-launch initial schema. Creates `users`, which 0003's article_stars / article_reads tables reference via FK; replaying 0003 against an empty schema fails at FK declaration without it | (FK base) |
| `migrations/0002_article_tags.sql` | Pre-launch `ALTER TABLE articles ADD COLUMN tags_json`; depends on 0001's `articles` table existing first | (FK base) |
| `migrations/0003_global_feed.sql` | Global-feed rework - DROPs pre-launch tables and recreates the canonical schema: articles, tags, sources, stars, reads, scrape_runs (gains `chunk_count`, `finalize_enqueued` via 0008, `finalize_recorded` via 0010 in later migrations) | (foundational) |
| `migrations/0004_system_user.sql` | `__system__` sentinel user | (schema) |
| `migrations/0005_auth_links.sql` | Cross-provider account dedup table | [REQ-AUTH-007](../../sdd/spec/authentication.md#req-auth-007-cross-provider-account-dedup) |
| `migrations/0006_e2e_user.sql` | `__e2e__` sentinel user | (schema) |
| `migrations/0007_scrape_chunk_completions.sql` | Atomic chunk-completion tracking table | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract) |
| `migrations/0008_scrape_runs_finalize_lock.sql` | Atomic finalize-enqueue gate column - the closing chunk consumer wins this gate to enqueue exactly one finalize message per run | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `migrations/0009_refresh_tokens.sql` | `refresh_tokens` table for the access/refresh-token split (30-day opaque token with rotation chain and reuse-detection) | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation), [REQ-AUTH-008](../../sdd/spec/authentication.md#req-auth-008-refresh-token-rotation-and-per-device-logout) |
| `migrations/0010_scrape_runs_finalize_recorded.sql` | `finalize_recorded` gate column - atomic idempotency for finalize-pass run-once invariant; the column is now load-bearing for the semantic-dedup pass instead of LLM-cost recording (the LLM call is gone). | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `migrations/0011_article_embeddings.sql` | `embedding_status` (NULL / `'embedded'` / `'failed'`) and `embedded_at` columns on `articles`. NULL = never attempted; chunk consumer stamps `'embedded'` after Vectorize upsert or `'failed'` on upsert error. The admin embed-backfill route retries NULL and `'failed'` rows. | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `migrations/0012_article_source_snippet.sql` | `source_snippet` TEXT column on `articles`. Stores the raw scraped body excerpt used as the embedding input so re-embeds run without re-scraping. NULL on historical rows (`buildEmbeddingInput` falls back to `details_json`). | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) |
| `migrations/0013_dedup_runs.sql` | `dedup_runs` audit table for the queue-driven historical-dedup sweep: ULID primary key, status (`'running'` / `'done'` / `'failed'`), running counters (scanned, merged, batch_count, remaining), composite cursor (`last_cursor_pa`, `last_cursor_id`), error message, started_at + updated_at. Indexed on `started_at DESC` for the operator surface to surface the latest run. | [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1 |
| `src/queue/pipeline-consumer.ts` | Backend-driven full pipeline orchestrator. Walks seven phases (`reembed_flip → reembed_drain → scrape_kick → scrape_wait → embed_drain → dedup_kick → dedup_wait`) by self-chaining `pipeline-jobs` messages. Each phase CAS-guards its `current_phase` UPDATE so redeliveries do not re-advance. | [REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface), [REQ-OPS-009](../../sdd/spec/observability.md#req-ops-009-admin-pipeline-run-progress-surface) |
| `src/lib/kick-coordinator.ts` | Shared atomic-claim coordinator kicker used by both the operator-driven force-refresh route and the pipeline-consumer's `scrape_kick` phase. Inserts a `scrape_runs` row + sends one `SCRAPE_COORDINATOR` message under a `WHERE NOT EXISTS` guard to coalesce concurrent kicks. | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface) |
| `migrations/0014_pipeline_runs.sql` | `pipeline_runs` audit table for the backend-driven full pipeline orchestrator: ULID primary key, status (`'running'` / `'done'` / `'failed'`), mode (`'full'` / `'wipe'`), `current_phase`, scrape_run_id + dedup_run_id references, embed counters, error, started_at + updated_at. Indexed on `started_at DESC` for the polling endpoint. | [REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface) |

**`scrape-finalize-consumer.ts` detail ([REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) AC 2, AC 3, [REQ-PIPE-012](../../sdd/spec/generation.md#req-pipe-012-same-story-matching-policy-variants), [REQ-PIPE-009](../../sdd/spec/generation.md#req-pipe-009-llm-re-rank-pass-for-borderline-same-story-candidates)):**

Per-article Vectorize top-K query (topK=20, AD40), time-window pre-filter (`DEDUP_TIME_WINDOW_SECONDS`), same-vendor cosine penalty, two-tier merge logic with auto-merge band (>= `DEDUP_COSINE_THRESHOLD`) and borderline band (>= `DEDUP_RERANK_FLOOR`) where `dedup-rerank.ts` decides via LLM judgment.

Bidirectional merge (AD41) - winner is always the older article in the pair regardless of which side was just ingested. Multi-rerank (AD42) - all borderline candidates sorted by direction-preference + cosine; walks up to `RERANK_CANDIDATE_CAP=5` in order, taking the first same-event=true verdict instead of stopping at the top candidate.

After the `finalize_recorded` gate flips, enqueues exactly one `dedup-sweep` continuation scoped to the last 7d (AD42 - derived from `DEDUP_TIME_WINDOW_SECONDS` at runtime via `autoSweepLookbackSeconds` so the cursor scope and the per-pair gate always match under any env override; [REQ-PIPE-013](../../sdd/spec/generation.md#req-pipe-013-same-story-cross-tick-automation-and-retention-coupling) AC 3) so cross-tick pairs the per-tick pass cannot see merge automatically without operator action. Atomic `finalize_recorded` gate prevents double-counting on redelivery.

## 5. Request Lifecycles

### 5.1 Global-feed pipeline (every 4 hours)

<!-- doc-allow-element: AD46 diagram-section exemption (pipeline flow) -->
```
Cron (00/04/08/12/16/20 UTC)
  └─► SCRAPE_COORDINATOR queued
       │
       ▼
Coordinator
  ├─ Synthesise per-tag Google News query-RSS source for every tag in
  │  (default-seed ∪ curated ∪ discovered KV); skip tags with a bespoke
  │  hand-tuned GN curated entry (REQ-PIPE-019)
  ├─ Fan out {tag × source} pairs (concurrency 10)
  ├─ Mark cross-site feed snippets for linked-page body fetch; discard discussion/score metadata fallback (REQ-PIPE-010 AC 2-3)
  ├─ Record per-URL fetch outcome → KV source_health:{url}
  ├─ Evict URLs at 30 consecutive failures; re-queue discovery if feed list empties
  ├─ Drop candidates older than 48 h; keep undated candidates
  ├─ Canonical-URL dedup across all candidates
  ├─ Re-seen URLs: INSERT OR IGNORE new sources into article_sources (multi-source aggregation);
  │  ingested_at and primary attribution are NOT re-stamped (first-ingestion preserved)
  ├─ Google News wrappers whose titles strongly match recent stored articles are source/tag-appended
  │  and skipped before LLM fan-out (REQ-PIPE-019 AC 3-4)
  └─ Chunk → enqueue one SCRAPE_CHUNK per chunk
       │
       ▼
Chunk consumer (per chunk)
  ├─ Fetch article bodies for short-snippet candidates (concurrency 20)
  ├─ Compact long body text to lead + high-signal factual passages for the prompt (REQ-PIPE-022 AC 1-2)
  ├─ Single DEFAULT_MODEL_ID call (`dynamic/news_digest` AI Gateway route); align output to inputs by echoed index
  ├─ If invalid JSON consumed tokens, add zero-article `scrape_runs` token/cost stats before queue retry
  ├─ Reject 10+ model-emitted tags for queue retry; count that completed LLM call as zero-article token/cost spend before throwing
  ├─ Filter accepted tags against the system-approved allowlist + candidate-local source tags
  ├─ Canonical-URL dedup within chunk (first-source-wins)
  ├─ Build embedding inputs (title + body, length-capped)
  ├─ Single Workers AI embedding call to bge-base-en-v1.5 → vectors
  ├─ INSERT articles (with embedding_status='embedded', source_snippet), alt_sources, tags (D1 batch)
  ├─ VECTORIZE.upsert(id, vector, {published_at, primary_source_url}); on failure UPDATE row to embedding_status='failed'
  └─ Atomic completion gate (D1 - see AD7): first completion adds per-chunk token/cost/article counters to `scrape_runs`;
     last chunk stamps run `ready` and enqueues SCRAPE_FINALIZE
       │
       ▼
Finalize consumer (semantic same-story dedupe - REQ-PIPE-003, REQ-PIPE-009)
  ├─ Skip when ≤ 1 article in the run (finalize_noop)
  ├─ SELECT finalize_recorded upfront - if already 1, skip before any Vectorize call
  ├─ For each article in the run:
  │   ├─ VECTORIZE.queryById(self.id, topK=20, returnMetadata='all') [topK=20 per AD40]
  │   ├─ Filter matches: id != self.id, |self.published_at - metadata.published_at| <= DEDUP_TIME_WINDOW_SECONDS (default 7d)
  │   ├─ Adjusted score = raw cosine - DEDUP_SAME_VENDOR_PENALTY (if same eTLD+1); raw cosine alone used for high-confidence band
  │   ├─ Existence guard: SELECT 1 FROM articles WHERE id = ? - drop matches whose D1 row is gone (stale-vector race)
  │   ├─ Bidirectional merge (AD41): look for OLDER eligible matches (merge self INTO older) AND NEWER matches (merge newer INTO self)
  │   ├─ Auto-merge band (>= DEDUP_COSINE_THRESHOLD or >= DEDUP_HIGH_CONFIDENCE_COSINE): mergeAsAltSource directly
  │   └─ Borderline band [DEDUP_RERANK_FLOOR, DEDUP_COSINE_THRESHOLD): sort candidates; walk up to RERANK_CANDIDATE_CAP=5;
  │       first same-event=true LLM verdict triggers mergeAsAltSource (multi-rerank per AD42)
  ├─ D1.batch the accumulated merge statements
  ├─ VECTORIZE.deleteByIds(merged-away ids)
  ├─ Atomic gate: UPDATE scrape_runs SET finalize_recorded=1 … WHERE finalize_recorded=0
  └─ Enqueue one DEDUP_SWEEP message scoped to last 7d (derived from DEDUP_TIME_WINDOW_SECONDS at runtime - REQ-PIPE-013 AC 3)
```

Cross-site feed-snippet handling ([REQ-PIPE-010 AC 2-3](../../sdd/spec/generation.md#req-pipe-010-body-fetch-for-thin-feed-snippets)) is implemented by `feedSnippetFromCandidates`, which flags cross-site article URLs and removes discussion/score wrappers, and by `fetchAndBuildPromptCandidates`, which fetches forced candidates before prompt construction. <!-- @impl: src/lib/sources.ts::feedSnippetFromCandidates --> <!-- @impl: src/queue/scrape-chunk-consumer.ts::fetchAndBuildPromptCandidates -->

The operator-driven `pipeline-jobs` orchestrator wraps this scrape flow with `scrape_kick` and `scrape_wait` phases ([REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence), [REQ-PIPE-016](../../sdd/spec/generation.md#req-pipe-016-scrape_runs-idempotency-and-stuck-run-cleanup); source: `src/queue/pipeline-consumer.ts::runScrapeWait`). During `scrape_wait`, it polls the linked `scrape_runs` row on a bounded 10-second cadence. If the coordinator has claimed dispatch but the internal `chunk_count = -1` marker remains past the shorter coordinator budget, the orchestrator resets that marker and sends one replacement coordinator message. After that one recovery attempt, the longer scrape-wait cap applies; a still-running scrape is marked failed rather than re-enqueued forever.

### 5.2 Operator force-refresh

Implements [REQ-OPS-005](../../sdd/spec/observability.md#req-ops-005-admin-force-refresh-endpoint). The endpoint reuses an in-progress run when one exists within the last two minutes; otherwise it starts a fresh coordinator dispatch - same data flow as the 4-hour cron. See [`api-reference-admin.md - POST /api/admin/force-refresh`](api-reference-admin.md#post-apiadminforce-refresh) for the full request/response contract.

### 5.3 Daily retention (03:00 UTC)

```
Cron daily 03:00 UTC
  ├─ Pass 1 - Article retention
  │   DELETE articles WHERE published_at < now-14d AND NOT starred by any user
  │   FK cascade: alt sources, tag rows, read marks
  ├─ Pass 2 - Stuck-tag prune
  │   For each sources:{tag} entry with feeds:[] AND discovered_at < now-7d
  │   remove that tag from every user's hashtags_json
  ├─ Pass 3 - Orphan-tag KV sweep
  │   DELETE sources:{tag} and discovery_failures:{tag} for tags no user owns
  └─ Pass 4 - Orphan-run retirement (REQ-PIPE-016 AC 3)
      Force-fail any scrape_runs row at chunk_count=-1 (coordinator
      dispatch sentinel) with created_at < now-6h. 6h is past every
      legitimate in-flight dispatch; chunk consumers exhaust in minutes.
```

### 5.4 Operator-triggered historical-dedup sweep

Implements [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1, AC 2. The sweep is operator-triggered from `/settings`, runs server-side independent of the operator's browser tab, and is observable via a status endpoint.

<!-- doc-allow-element: AD46 diagram-section exemption (historical-dedup flow) -->
```
Operator clicks "Run historical-dedup sweep" on /settings
  └─► POST /api/admin/historical-dedup (empty body - kicker mode)
       ├─ INSERT dedup_runs row (status='running', cursor=NULL)
       ├─ env.DEDUP_SWEEP.send({ run_id, cursor: null, batch })
       └─ 202 { ok, run_id, enqueued: true, started_at }
            │
            ▼
Operator surface starts polling GET /api/admin/dedup-status?run_id=…
       (browser tab can close - sweep continues server-side)

DEDUP_SWEEP consumer (max_batch_size=1, max_retries=3)
  ├─ runHistoricalDedupBatch(env, cursor, batch) - one keyset page
  ├─ UPDATE dedup_runs SET scanned, merged, batch_count, last_cursor_*, remaining, updated_at
  ├─ If next_cursor present:
  │   └─ env.DEDUP_SWEEP.send({ run_id, cursor: next_cursor, batch }) - self-chain
  └─ Else (terminal):
      └─ UPDATE dedup_runs SET status='done', updated_at

On terminal failure (after max_retries):
  └─ UPDATE dedup_runs SET status='failed', error=…, updated_at

Operator sees status='done' on next poll; banner clears on next visit.
```

Synchronous single-batch path (legacy, retained for dev-bypass curl flows and tests): `POST /api/admin/historical-dedup` with `{cursor, batch}` in the body bypasses the kicker and runs `runHistoricalDedupBatch` inline, returning the batch result directly. The route preserves backwards compatibility with existing test fixtures and the `news.novoselec.ch` integration runbook.

### 5.5 Email dispatcher (every 5 minutes)

```
Cron every 5 minutes
  ├─ DISTINCT-tz probe: SELECT DISTINCT tz FROM users WHERE email_enabled=1
  └─ For each tz bucket:
       ├─ Skip if tz fails isValidTz check
       ├─ SELECT users in this tz inside the current 5-minute digest window
       └─ For each user:
            ├─ Fetch headlines + tag tally via Promise.allSettled
            ├─ Skip if headlines.length == 0 (no email, no last_emailed stamp)
            └─ Render email, send via Resend, stamp last_emailed_local_date
```

## 6. Data Flow

Articles are the central entity in the article pool. Each article belongs to a `scrape_runs` row (one row per scrape run), not to a user. Users read from the pool by filtering on their active hashtags. Foreign keys cascade on delete. Starred articles are user-scoped and exempt from the 14-day retention cleanup.

`pending_discoveries` rows are per-user, but the discovery results themselves (`sources:{tag}` in KV) are globally shared so multiple users benefit from a single discovery run. The coordinator may insert system-owned rows (`user_id = '__system__'`) when a feed eviction empties a tag's source list - real-user queries scoped `WHERE user_id = ?` naturally exclude these. The sentinel row keeps the tag entry alive so the next discovery cycle has a target; deleting it would cascade-drop downstream `article_tags` references and lose the tag from every user's headline view.

## 7. Cross-cutting Concerns

| Concern | Mechanism | Detail |
|---|---|---|
| Authentication | 5-minute access JWT + 30-day rotating refresh token | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-access-token--refresh-token-instant-revocation), [REQ-AUTH-008](../../sdd/spec/authentication.md#req-auth-008-refresh-token-rotation-and-per-device-logout) |
| CSRF defence | `Origin` header check on every state-changing request | [REQ-AUTH-003](../../sdd/spec/authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints) |
| Rate limiting | KV window-counter, applied to auth routes, mutation routes, and authenticated polling endpoints | `src/lib/rate-limit.ts`, [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) AC 9 |
| Security headers | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` | [REQ-OPS-003](../../sdd/spec/observability.md#req-ops-003-content-security-policy-on-every-response) |
| Observability | Structured JSON logs via closed `LogEvent` enum | [REQ-OPS-001](../../sdd/spec/observability.md#req-ops-001-structured-json-logging) |
| Error surfaces | Closed `ErrorCode` enum, sanitised user-facing messages | [REQ-OPS-002](../../sdd/spec/observability.md#req-ops-002-sanitized-error-surfaces) |
| Admin gate | Worker-side baseline: signed-in session + `ADMIN_EMAIL` match. Optional perimeter when `CF_ACCESS_AUD` is set: Cloudflare Access assertion + `aud` claim match (AD29 + AD30); `exp` claim validated server-side (AD44). | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) AC 8, AC 8a |

## 8. Build and Deploy

PWA icons render from `public/icons/app-icon.svg` via `scripts/generate-pwa-icons.mjs` (192×192 and 512×512 PNGs, regenerated on every build). Astro produces `dist/_worker.js/index.js`; `scripts/merge-worker-handlers.mjs` post-processes by bundling `src/worker.ts` and writing `dist/_worker.js/_merged.mjs`, which Wrangler deploys. See [`deployment.md`](deployment.md) for the full pipeline.

### Client-script convention

The site CSP is `script-src 'self'`, which blocks every inline `<script>...</script>` block. Astro inlines page-level `<script>` blocks that contain no `import` statement, so a script written without an import is silently dropped at runtime.

**Pattern A - Astro-bundled (lives under `src/scripts/bundled/`):** the script is imported from an Astro component or page, and Astro/Vite bundles it into the page's hashed JS:

```astro
<script>import { toggleTheme } from '~/scripts/bundled/<module>';</script>
```

Astro emits the code as an external `<script type="module" src="/_astro/...js">` bundle that CSP allows. New Pattern A files go directly under `src/scripts/bundled/`; the build script ignores that subdirectory. Scripts currently using this pattern: `digest-page.ts` (digest grid interactivity), `history-page.ts` (history pagination and tag filtering), `tag-railing-flip.ts` (settings tag railing).

**Pattern B - static mirror (lives at `src/scripts/<module>.ts`):** for scripts that must run on every page regardless of which Astro page initiated the navigation (e.g., `card-interactions.ts` running on `/digest`, `/history`, and `/starred`), the build script compiles the TypeScript into `public/scripts/<module>.js` and the layout loads it directly:

```astro
<script is:inline type="module" src="/scripts/<module>.js"></script>
```

The `is:inline` attribute prevents Astro from re-bundling the file. `scripts/build-client-scripts.mjs` rebuilds every Pattern B file on every `npm run build`, so the mirror cannot drift from its source. Scripts currently using this pattern: `page-effects.js`, `card-interactions.js`, `alt-sources-modal.js`, `install-prompt.js`, `offline.js`, `rate-limited.js`, `article-detail.js`, `theme-toggle.js`. (`tag-railing-flip.ts` is the lib helper imported via Pattern A - see line 138 - not a Pattern B script.)

Replaces the prior hand-maintained `SKIP` set in `build-client-scripts.mjs` (CF-023).

**Critical constraint:** a Pattern B script MUST NOT also be statically imported by any Astro page or component. Doing so causes Vite to bundle the entire module - including its auto-wire IIFE - into the page's `_astro/*.js` chunk. Both module instances share `document` but have independent closure state, so any listener-idempotency flag in module scope fails to deduplicate across the two evaluations. Idempotency tokens for scripts in this situation must live on `window`. See [AD20](../decisions/README.md#ad20-idempotency-tokens-for-client-scripts-loaded-both-as-pattern-b-iife-and-via-page-level-import-must-live-on-window) for the full decision record and the CI gate that enforces this constraint.

---

## Design System Tokens

CSS custom properties declared in `src/styles/global.css` and consumed throughout the component tree.

**Implements:** [REQ-DES-001](../../sdd/spec/design.md#req-des-001-swiss-minimal-visual-language), [REQ-DES-003](../../sdd/spec/design.md#req-des-003-deliberate-motion-system)

### Type scale

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | 12 px | Captions, metadata |
| `--text-sm` | 14 px | Secondary body, labels |
| `--text-base` | 16 px | Primary body |
| `--text-lg` | 20 px | Card titles, section headers |
| `--text-2xl` | 32 px | Display (article detail heading) |

Font stacks: sans `(-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif)` for body/UI; serif `(Charter, "Iowan Old Style", Georgia, "Noto Serif", "Source Serif Pro", serif)` for article titles. No webfont download.

Weights: 400 (body), 600 (headings and labels).

### Motion tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | All transitions |
| `--duration-fast` | 150 ms | Micro-interactions (hover, press) |
| `--duration-base` | 250 ms | Component transitions, View Transitions |
| `--duration-slow` | 400 ms | Page-level transitions |

---

## Related Documentation

- [`api-reference.md`](api-reference.md) - Endpoint contracts
- [`configuration.md`](configuration.md) - Env vars, secrets, bindings
- [`deployment.md`](deployment.md) - Local development and production deployment
- [`decisions/README.md`](../decisions/README.md) - Architecture Decision Records
- [`../sdd/`](../../sdd/) - Product specification (REQs, ACs, status)
