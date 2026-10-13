# Product Changes

User-visible changes to the product contract. Specification formatting, review history, and verification operations remain in Git history.

The complete prior changelog is preserved in [changes-archive-2026-10.md](changes-archive-2026-10.md); the earlier global-feed transition is preserved in [changes-archive-2026-04.md](changes-archive-2026-04.md).

## 2026-10-13

- REQ-OPS-006 is Partial: integration deployment criteria retain unresolved automated-verification gaps; deployed behavior is unchanged.

## 2026-06-12

- REQ-SET-004: pipeline inference uses OpenAI `gpt-6-luna` through Cloudflare AI Gateway, retaining the previous dynamic route for rollback.
- REQ-PIPE-011 and REQ-PIPE-020: high-confidence listing failures are dropped before summarisation, blocked-publisher headlines are recognised, and broad-source tags require article-level evidence.
- REQ-PIPE-022: operators can observe summarisation input counts, and chunks with no surviving prompt candidates complete without model spend.

## 2026-06-11

- REQ-PIPE-010 and REQ-PIPE-011: portal-like candidates receive body-quality checks and confirmed non-articles are dropped before summarisation.

## 2026-06-10

- REQ-PIPE-019: only high-confidence Google News title matches are suppressed; same-topic partial overlaps remain eligible for summarisation.

## 2026-06-09

- REQ-SET-004: the pipeline default moved to Gateway dynamic routing, enabling operator-controlled model selection without an application deploy.
- REQ-PIPE-020: candidate-local tags constrain stored output, and excessive model tag fan-out retries the chunk before persistence.
- REQ-PIPE-015 and REQ-PIPE-020: failed JSON attempts and tag-fanout retries retain their token and cost accounting.
- REQ-PIPE-019 and REQ-PIPE-022: recent title-matched wrappers append sources without another summary, while long source bodies are compacted into grounded context.
- REQ-PIPE-010: outbound-link snippets no longer prevent fetching the linked article body.

## 2026-06-08

- REQ-PIPE-001, REQ-PIPE-016, and REQ-PIPE-021: scrape progress follows completed chunks, interrupted dispatch can recover, and empty runs retain terminal state.
- REQ-DISC-001 and REQ-DISC-009: discovery drains every ten minutes; retryable misses remain pending until the bounded failure limit.
- REQ-PIPE-020 and REQ-PIPE-002: invalid tags are excluded, and legacy duplicate hints remain confined to the current chunk.

## 2026-06-07

- REQ-SET-004: the integration default moved to Gemini Flash-Lite through AI Gateway.
- REQ-PIPE-002, REQ-PIPE-003, REQ-PIPE-015, and REQ-PIPE-016: chunk output is indexed, unusable candidates receive empty drop records, same-story collapse stays separate, and stalled dispatch receives one bounded recovery attempt.

## 2026-05-14

- REQ-PIPE-009 and REQ-PIPE-024: borderline judgments are batched, recurring sweeps remember previously judged pairs, and manual sweeps can bypass that watermark.
- REQ-SET-004: the attempted smaller model default was rolled back after scrape failures; batching and watermark behavior were retained.
- REQ-OPS-008 and REQ-OPS-010: one "Refresh articles" action replaces the two equivalent pipeline controls, with an optional wipe-and-re-embed phase.

## 2026-05-12

- REQ-PIPE-014: historical sweeps pause during a complete same-story-index outage rather than skipping affected articles.
- REQ-PIPE-001: an overlong scrape wait ends with a visible failed status.
- REQ-AUTH-006 and REQ-AUTH-010: destructive pipeline runs require an explicit POST, and production deployments keep the test-only authentication routes unavailable.

## 2026-05-11

- REQ-DISC-001: a new account's first discovery tags take priority over the steady-state backlog.
- REQ-PIPE-012 and REQ-PIPE-013: automatic same-story matching covers a week-long news cycle.
- REQ-PIPE-011: blocked financial and stock-pump publishers are excluded before summarisation.

## 2026-05-10

- REQ-PIPE-013: cross-day duplicate clusters collapse without an operator sweep.
- REQ-PIPE-009: reranking considers further borderline candidates when the closest candidate is unrelated.

## 2026-05-09

- REQ-PIPE-003: cross-tick duplicates merge independently of arrival order, and equal-time wire copies collapse deterministically.

## 2026-05-08

- REQ-PIPE-012: a stricter similarity threshold and news-cycle window protect distinct stories from broad-topic over-merging.
- REQ-OPS-008 and REQ-OPS-009: pipeline execution continues independently of the browser tab, and recent terminal status survives reloads.

## 2026-05-07

- REQ-PIPE-009: language-model judgment resolves borderline same-event pairs without lowering the automatic merge threshold.
- REQ-PIPE-014 and REQ-PIPE-016: sweep progress survives navigation, and counters advance once despite redelivery.
- REQ-READ-011: a reader arriving during a scrape sees in-progress state instead of a stale countdown.

## 2026-05-06

- REQ-PIPE-003 and REQ-PIPE-014: same-story matching spans the surviving pool, with operator diagnostics and embedding rebuilds.
- REQ-READ-001: multi-source cards show the additional-source count across reading surfaces.
- REQ-PIPE-002: summary requests use the shorter 100–150-word range while the minimum retention backstop remains 80 words.

## 2026-05-05

- REQ-AUTH-006: Cloudflare Access is an optional perimeter in addition to the application session and operator gate.
- REQ-PIPE-019: per-tag Google News sources provide baseline coverage without duplicating direct-publisher stories.
- REQ-AUTH-005: account deletion clears both access and refresh cookies.

## 2026-05-04

- REQ-STAR-001: every article-listing surface exposes the star action and renders initial saved state.
- REQ-OPS-006: an isolated, manually deployed integration environment supports pre-production acceptance.
- REQ-OPS-007: crawlers receive a sitemap containing only public routes.

## 2026-05-03

- REQ-PIPE-002: server-side title and summary sanity limits reject malformed output before persistence.
- REQ-OPS-003: image origins are restricted and frame embedding is denied.
- REQ-READ-001 and REQ-PIPE-017: ordering follows first ingestion; later sightings append sources without refreshing that timestamp.

## 2026-04-29

- REQ-OPS-003: inline styles remain permitted while the script policy stays same-origin only.
- REQ-OPS-004: structured-data output escapes HTML state-transition characters.
- REQ-RATE-001: authenticated polling and timezone updates receive per-user limits.

## 2026-04-28

- REQ-PWA-004: the brand has a larger touch target and supports filter reset, return-home, and back-to-top behavior without intercepting modifier clicks.
- REQ-DES-002 and REQ-DES-004: selected themes control mobile chrome and persist across navigation.
- REQ-MAIL-003: zero-unread-article days produce no email.
- REQ-AUTH-011: steady-state fingerprint drift is tolerated, while grace-window mismatch remains a theft signal.
- REQ-SET-003: time labels follow the browser's clock convention.

## 2026-04-27

- REQ-MAIL-002: one invalid timezone or failed send does not block other recipients.
- REQ-AUTH-002 and REQ-AUTH-008: short-lived access and rotating refresh sessions support long-lived sign-in, benign concurrent refresh, and replay detection.
- REQ-PIPE-005 and REQ-HIST-001: retention and history cover fourteen days, with starred articles exempt from retention.
- REQ-AUTH-007: verified-email identity links consolidate cross-provider accounts.
- REQ-DISC-006: persistently empty discovery tags are removed after seven days.
