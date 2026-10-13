# Graph Report - ai-news-digest  (2026-10-13)

## Corpus Check
- 354 files · ~464,184 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .toml 2, .example 1)

## Summary
- 2337 nodes · 4982 edges · 161 communities (128 shown, 33 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e2f7fb1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sources.ts
- settings.astro
- worker.ts
- [provider]/login.ts
- discovery.ts
- devDependencies
- Decision Index
- API Reference
- signSession
- errors.ts
- scrape-coordinator.ts
- auth/refresh.ts
- digest-page.ts
- callback.ts
- scrape-chunk-consumer.ts
- compilerOptions
- cleanup.test.ts
- errorResponse
- lib/historical-dedup.ts
- 0014_pipeline_runs.sql
- Base.astro
- enforceRateLimit
- auth.ts
- Digest Generation
- [slug].astro
- rediscovery-lifecycle.test.ts
- originOf
- integration.test.ts
- Spec Changes
- dedup-diag.ts
- log
- digest.astro
- session-jwt.ts
- email.ts
- Architecture
- cron.test.ts
- dedup-rerank.ts
- main
- 4.2 Libraries (`src/lib/`)
- email-dispatch.ts
- api/settings.ts
- bundled/theme-toggle.ts
- Configuration
- history.astro
- cloudflare-test.ts
- pipeline-consumer.ts
- bidirectional-dedup.ts
- check-no-page-pattern-b.mjs
- crawler-policy.test.ts
- vitest
- types.ts
- page-effects.ts
- check-req-backlinks.mjs
- mergeAsAltSource
- scripts
- Reading Experience
- generateUlid
- SESSION_COOKIE_NAME
- security-headers.ts
- feed.test.ts
- sources-cache.ts
- sdd/README.md
- tag-railing-flip.test.ts
- Authentication
- check-wrangler-vars-parity.mjs
- generate-pwa-icons.mjs
- Observability
- dedupe.ts
- delete-initial.test.ts
- queue-handler.ts
- embed-backfill.test.ts
- alt-sources-modal.ts
- retry-bulk-endpoint.test.ts
- history/api.test.ts
- stats.test.ts
- force-refresh.test.ts
- 0001_initial.sql
- Non-Functional Requirements
- design.md
- Onboarding & Settings
- DigestCard.astro
- lib/embed-backfill.ts
- e2e-test.sh
- dedup-diag.test.ts
- Endpoints
- Deployment
- ref_node_path
- Source Discovery
- stats.ts
- set-tz.test.ts
- src/env.d.ts
- install-prompt.ts
- account.test.ts
- callback-google.test.ts
- Conventions
- Observability
- auth/account.ts
- blocked-publishers.ts
- scrape-finalize-consumer.ts
- historical-dedup.test.ts
- package.json
- coordinator.test.ts
- 0007_scrape_chunk_completions.sql
- idx_articles_embedding_status
- 0013_dedup_runs.sql
- finalize-vectorize.test.ts
- initFooterScramble
- fetch
- pipeline-status.ts
- chunk-consumer.test.ts
- discovery-status.test.ts
- rules
- dependencies
- manifest.test.ts
- ref_node_fs
- pipeline-run.test.ts
- logout.test.ts
- buildEmbeddingInput
- Admin-only routes (Cloudflare Access gating)
- Spec Changes — Archive (April 2026)
- canonical-url.ts
- dedup-sweep-consumer.test.ts
- PWA icons
- CF-003 at `src/pages/api/admin/embed-backfill.ts:69`, `src/pages/api/admin/historical-dedup.ts:118`, `src/pages/api/admin/discovery/retry.ts:93`, `src/pages/api/admin/discovery/retry-bulk.ts:155` (Missing rate limiting / cost amplification)
- Email Notifications
- History & Stats
- refresh-gone.test.ts
- rate-limited.ts
- data.test.ts
- article-detail.ts
- Architecture Decision Records
- Content sources
- validate-app-url.sh
- ~/styles/global.css
- news-digest — requirements (historical)
- News Digest — curated by an LLM
- news-digest — Product Specification
- Operational TODOs
- Motion & polish
- news-digest — Documentation
- HTTP API
- Email notifications (Resend)
- Security Policy
- Migrations
- LLM prompts
- User stats widget
- Scale and tradeoffs
- .doc-coverage.md

## God Nodes (most connected - your core abstractions)
1. `log()` - 158 edges
2. `vitest` - 129 edges
3. `Decision Index` - 65 edges
4. `signSession()` - 49 edges
5. `errorResponse()` - 48 edges
6. `originOf()` - 41 edges
7. `enforceRateLimit()` - 36 edges
8. `astro` - 33 edges
9. `checkOrigin()` - 32 edges
10. `requireAdminSession()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `PR Checks — CI gates (`test.yml`)` --references--> `main()`  [INFERRED]
  documentation/lanes/deployment.md → scripts/validate-curated-sources.mjs
- `Supported Versions` --references--> `main()`  [INFERRED]
  SECURITY.md → scripts/validate-curated-sources.mjs
- `AD24: Single OAUTH_JWT_SECRET for both session signing and CSRF state` --references--> `verifyHmacSignature()`  [INFERRED]
  documentation/decisions/README.md → src/lib/crypto.ts
- `AD48: Dedup cost reduction: borderline-rerank watermark + batched rerank call + pipeline-wide gpt-oss-20b` --references--> `clearWatermark()`  [INFERRED]
  documentation/decisions/README.md → src/lib/dedup-watermark.ts
- `Worker Vars (non-secret)` --references--> `readCosineThreshold()`  [INFERRED]
  documentation/lanes/configuration.md → src/lib/embeddings.ts

## Import Cycles
- None detected.

## Communities (161 total, 33 thin omitted)

### Community 0 - "sources.ts"
Cohesion: 0.07
Nodes (57): RFC-2822, AD22: SSRF defence relies on Workers network sandbox; static IP allowlist is best-effort only, AD59: Forced and portal-like candidate fetch with deterministic non-article drop, 5.1 Global-feed pipeline (every 4 hours), ArticleBodyResult, extractArticleText(), fetchArticleBodies(), fetchArticleBodiesWithQuality() (+49 more)

### Community 1 - "settings.astro"
Cohesion: 0.05
Nodes (58): AD57: AI Gateway dynamic route for pipeline model control, Props, AIRunResponse, escapeControlCharsInJsonStrings(), extractFirstJsonObject(), extractResponsePayload(), extractTokensIn(), extractTokensOut() (+50 more)

### Community 2 - "worker.ts"
Cohesion: 0.13
Nodes (20): handleBatch(), addChunkStats(), ChunkStats, finishRun(), nowSeconds(), ScrapeRunSeed, startRun(), handleDedupSweepBatch() (+12 more)

### Community 3 - "[provider]/login.ts"
Cohesion: 0.06
Nodes (47): RFC-7517, Admin endpoint cross-site guards, Admin gate and JWT exp validation, Auth cookie policy, Content-Security-Policy, Contents, Dev-bypass prod guard, Google id_token RS256 verification (+39 more)

### Community 4 - "discovery.ts"
Cohesion: 0.06
Nodes (31): asArray(), contentTypeMatches(), discoverTag(), hasJsonItem(), hasXmlItem(), itemHasTitleAndLink(), LLMDiscoveryPayload, narrowDiscoveryPayload() (+23 more)

### Community 5 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, @astrojs/check, @cloudflare/vitest-pool-workers, @cloudflare/workers-types, esbuild, knip, oxlint, @playwright/test (+6 more)

### Community 6 - "Decision Index"
Cohesion: 0.04
Nodes (49): AD10: Atomic conditional UPDATE as the once-per-run idempotency gate, AD11: Keep `style-src 'unsafe-inline'`; runtime `.style.X` writes are intentional, AD12: Integration env: separate Cloudflare resources, manual trigger from develop, crons disabled, AD13: No non-essential cookies (analytics gate), AD14: History-page perf-comparability test permanently skipped, AD17: Reject `dedupe-groups.ts` extraction, AD18: Reject `deferred-candidates.ts`; chunk-overflow path stays log-only, AD19: Reject `tag-railing-flip-core.ts`; FLIP measurements are not separable from DOM (+41 more)

### Community 7 - "API Reference"
Cohesion: 0.04
Nodes (45): API Reference, Authentication, Contents, Conventions, DELETE /api/articles/:id/star (Unstar article), DELETE /api/auth/account (Delete account, JSON path), Developer Tools, Digests (+37 more)

### Community 8 - "signSession"
Cohesion: 0.05
Nodes (15): signSession(), KNOWN_ARTICLE_IDS, sessionCookieFor(), UserRow, UserRow, validSessionCookie(), authedRequest(), authedRequestWithRunId() (+7 more)

### Community 9 - "errors.ts"
Cohesion: 0.09
Nodes (28): 7. Cross-cutting Concerns, ArticleRow, computeNextScrapeAt(), loadTodayPayload(), ScrapeRunRow, TodayResponse, WireArticle, DEFAULT_STATUS (+20 more)

### Community 10 - "scrape-coordinator.ts"
Cohesion: 0.11
Nodes (30): loadExistingCanonicalToIdMap(), loadExistingCanonicalUrls(), updateChunkCount(), SourceAdapter, SNIPPET_FLOOR, applyPreferDirectOverGoogleNews(), buildCandidates(), capChunks() (+22 more)

### Community 11 - "auth/refresh.ts"
Cohesion: 0.15
Nodes (24): hexEncode(), readCookie(), clientIp(), buildClearRefreshCookie(), deviceFingerprint(), findRefreshToken(), generateRefreshTokenValue(), generateRowId() (+16 more)

### Community 12 - "digest-page.ts"
Cohesion: 0.12
Nodes (28): animateStripScrollTo(), armScrollDownReveal(), FlipChipOptions, flipChipToFront(), flipChipToPosition(), isFlipLocked(), formatCountdown(), init() (+20 more)

### Community 13 - "callback.ts"
Cohesion: 0.12
Nodes (29): ExistingUserRow, verifyHmacSignature(), mapOAuthError(), OAUTH_ERROR_CODES, OAuthErrorCode, ProviderConfig, userIdFor(), buildRefreshCookie() (+21 more)

### Community 14 - "scrape-chunk-consumer.ts"
Cohesion: 0.12
Nodes (29): normaliseRawDedupGroups(), sanitizeText(), normalizeHashtag(), previewRawResponse(), splitIntoParagraphs(), alignLlmArticlesToInputs(), attachEmbeddings(), buildAnchorIndices() (+21 more)

### Community 15 - "compilerOptions"
Cohesion: 0.09
Nodes (21): astro/tsconfigs/strict, compilerOptions, allowJs, baseUrl, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, jsx (+13 more)

### Community 16 - "cleanup.test.ts"
Cohesion: 0.11
Nodes (22): errMsg(), purgeOldRefreshTokens(), loadOwnedTags(), runArticleRetention(), runChunkCompletionsPurge(), runCleanup(), runOrphanScrapeRunSweep(), runOrphanTagSweep() (+14 more)

### Community 17 - "errorResponse"
Cohesion: 0.16
Nodes (21): errorResponse(), RATE_LIMIT_RULES, rateLimitResponse(), RateLimitResult, RateLimitRule, SetTzBodySchema, applyRefreshCookie(), requireSession() (+13 more)

### Community 18 - "lib/historical-dedup.ts"
Cohesion: 0.11
Nodes (24): AD35: Operator historical-dedup sweep self-chains via Cloudflare Queue, AD36: Lower dedup auto-merge threshold to 0.78 and remove the per-batch rerank cap, readWatermark(), writeWatermark(), ArticleRow, DedupBatchResult, DedupCursor, DEFAULT_BATCH (+16 more)

### Community 20 - "Base.astro"
Cohesion: 0.06
Nodes (23): AD20: Idempotency tokens for client scripts loaded BOTH as Pattern B IIFE AND via page-level import must live on `window`, Props, Props, normalizedEmail, Props, cookieTheme, Props, safeJsonLd() (+15 more)

### Community 21 - "enforceRateLimit"
Cohesion: 0.15
Nodes (23): astro, sanitizeErrorDetail(), enforceRateLimit(), AccessJwtClaims, AdminAuthResult, audMatches(), requireAdminSession(), GET() (+15 more)

### Community 22 - "auth.ts"
Cohesion: 0.13
Nodes (23): findUnrevokedChild(), revokeAllForUser(), AuthenticatedUser, AuthEnv, CLEAR_BOTH_COOKIES, handleRevokedReplayPath(), loadSession(), loadSessionForPage() (+15 more)

### Community 23 - "Digest Generation"
Cohesion: 0.08
Nodes (25): Digest Generation, Out of Scope, REQ-PIPE-001: Global scrape-and-summarise pipeline on a fixed cadence, REQ-PIPE-002: Chunked LLM output content contract, REQ-PIPE-003: Same-story dedupe — core matching contract, REQ-PIPE-004: Curated source registry with ≥50 feeds spanning the 21 system tags, REQ-PIPE-005: Fourteen-day retention with starred-exempt cleanup, REQ-PIPE-006: scrape_runs aggregation surfaces stats, history, and in-flight progress (+17 more)

### Community 24 - "[slug].astro"
Cohesion: 0.09
Nodes (18): MONTHS, primaryFormatted, primaryIso, Props, safeHref(), AltSourceRow, altSources, altSourcesResult (+10 more)

### Community 25 - "rediscovery-lifecycle.test.ts"
Cohesion: 0.11
Nodes (10): clearHealth(), CONSECUTIVE_FETCH_FAILURE_LIMIT, FeedHealthResult, healthKey(), recordFetchResult(), E2E_USER_ID, SYSTEM_USER_ID, KvStub (+2 more)

### Community 26 - "originOf"
Cohesion: 0.15
Nodes (15): clearDiscoveryFailure(), DiscoveryRetryBodySchema, checkDevEndpointOrigin(), forbiddenOriginResponse(), OriginCheckResult, originOf(), UNSAFE_METHODS, executeRetryBulk() (+7 more)

### Community 27 - "integration.test.ts"
Cohesion: 0.08
Nodes (8): dispatchDailyEmails(), SendEmailParams, SqlCall, TzRow, UserRow, CapturedCall, DispatchUserRow, PreparedCall

### Community 28 - "Spec Changes"
Cohesion: 0.09
Nodes (23): 2026-04-27, 2026-04-28, 2026-04-29, 2026-05-03, 2026-05-04, 2026-05-05, 2026-05-06, 2026-05-07 (+15 more)

### Community 29 - "dedup-diag.ts"
Cohesion: 0.17
Nodes (20): BgeRunResult, cosineSimilarity(), DEFAULT_COSINE_THRESHOLD, DEFAULT_HIGH_CONFIDENCE_COSINE, DEFAULT_SAME_VENDOR_PENALTY, DEFAULT_TIME_WINDOW_SECONDS, deleteVectorsBatched(), EMBEDDING_MODEL_ID (+12 more)

### Community 30 - "log"
Cohesion: 0.17
Nodes (17): Event envelope, clearWatermark(), MAX_BATCH, log(), LogEvent, LogLevel, LogRecord, hasBearerAuth() (+9 more)

### Community 31 - "digest.astro"
Cohesion: 0.11
Nodes (14): Props, redirect(), requireSettingsComplete(), gated, rawSelectedTags, selectedTagSet, sortedUserTags, tagCounts (+6 more)

### Community 32 - "session-jwt.ts"
Cohesion: 0.14
Nodes (11): base64UrlDecode(), MIN_JWT_SECRET_BYTES, requireStrongJwtSecret(), getHmacKey(), HEADER_B64, isSessionClaims(), JWT_CLOCK_SKEW_SECONDS, SessionClaims (+3 more)

### Community 33 - "email.ts"
Cohesion: 0.16
Nodes (16): EmailHeadline, HeadlineRow, TagTally, TallyRow, TotalRow, DigestReadyEmailParams, escapeHtml(), headlineRow() (+8 more)

### Community 34 - "Architecture"
Cohesion: 0.10
Nodes (21): 1. Overview, 2. Components, 3. Repository Layout, 4.1 Middleware, 4.3 Pages and API Routes, 4.4 Layouts, Components, and Client Scripts, 4. Source Module Map, 5.2 Operator force-refresh (+13 more)

### Community 35 - "cron.test.ts"
Cohesion: 0.20
Nodes (3): scheduled(), QueueMock, SqlCall

### Community 36 - "dedup-rerank.ts"
Cohesion: 0.14
Nodes (15): BatchPayload, BatchVerdictEntry, buildBatchUser(), DEFAULT_RERANK_FLOOR, narrowBatchPayload(), readRerankFloor(), RERANK_BATCH_SIZE, RERANK_SYSTEM (+7 more)

### Community 37 - "main"
Cohesion: 0.21
Nodes (11): AD15: Test pool exercises worker.ts directly; production runs through the Astro-merged entry, AD49: `workflow_run` deploy gate hardened against fork pwn-request vector, Environment-specific configuration, Playwright E2E (live), Production Deployment, Deploy your own, __dirname, main() (+3 more)

### Community 38 - "4.2 Libraries (`src/lib/`)"
Cohesion: 0.16
Nodes (16): 4.2 Libraries (`src/lib/`), BRAND_ONLY_TAGS, CURATED_SOURCES, CURATED_TAGS, CuratedSource, CuratedSourceKind, GOOGLE_NEWS_CURATED_TAGS, googleNewsSourceForTag() (+8 more)

### Community 39 - "email-dispatch.ts"
Cohesion: 0.22
Nodes (16): selectUnreadHeadlinesForUser(), tagTallySinceMidnight(), dispatchForTz(), DispatchUserRow, loadDispatchUsers(), processOneUser(), TzRow, sendEmail() (+8 more)

### Community 41 - "api/settings.ts"
Cohesion: 0.21
Nodes (14): HASHTAG_REGEX, MAX_HASHTAGS, SettingsPutBodySchema, TagsPostBodySchema, checkOrigin(), findTagsNeedingDiscovery(), GET(), isIntegerInRange() (+6 more)

### Community 42 - "bundled/theme-toggle.ts"
Cohesion: 0.20
Nodes (13): applyHtmlBgInlineStyle(), applyMetaThemeColor(), applyTheme(), BG_BY_THEME, DATA_ATTR, nextTheme(), persistTheme(), persistThemeCookie() (+5 more)

### Community 43 - "Configuration"
Cohesion: 0.11
Nodes (18): AI Gateway setup, Compatibility, Configuration, Configuration Files, Contents, Cron, DEV_BYPASS_USER_ID override, GitHub Actions Secrets (+10 more)

### Community 44 - "history.astro"
Cohesion: 0.13
Nodes (13): slugify(), stripHyphens(), data, DayGroup, filteredArticles, HistoryResponse, initialSelectedTagSet, rawDateParam (+5 more)

### Community 45 - "cloudflare-test.ts"
Cohesion: 0.18
Nodes (8): applyD1Migrations, env, insertArticle(), insertUser(), now(), insertArticle(), now(), UserRow

### Community 46 - "pipeline-consumer.ts"
Cohesion: 0.24
Nodes (15): countChunkCompletions(), recordChunkCompletion(), advancePhase(), markFailed(), PipelineRunRow, processOnePipelineMessage(), runDedupKick(), runDedupWait() (+7 more)

### Community 47 - "bidirectional-dedup.ts"
Cohesion: 0.20
Nodes (11): AD43: Shared per-match dedup classifier; outer control flow stays per-consumer, ClassifierParams, classifyMatchPair(), ClassifyOutcome, MatchInput, SelfArticle, AGGREGATOR_HOSTS, etldPlusOne() (+3 more)

### Community 48 - "check-no-page-pattern-b.mjs"
Cohesion: 0.21
Nodes (10): allOffenders, componentDir, componentOffenders, isTypeOnlyImport(), listAstroFiles(), pageOffenders, REPO_ROOT, report (+2 more)

### Community 51 - "types.ts"
Cohesion: 0.24
Nodes (10): isGoogleNewsUrl(), preferDirectOverGoogleNews(), sharedTitleTokenCount(), SourceFetchResult, TITLE_STOPWORDS, titlesShareAnyToken(), tokenizeTitle(), Headline (+2 more)

### Community 52 - "page-effects.ts"
Cohesion: 0.17
Nodes (11): BeforeSwapEvent, bindBrandLinkScrollToTop(), clearAllVtNames(), findPromotableCard(), KEY(), promoteIncomingCardForReturnMorph(), promoteSourceCardForOutgoingMorph(), restoreScroll() (+3 more)

### Community 53 - "check-req-backlinks.mjs"
Cohesion: 0.20
Nodes (10): findAllRefs(), findSddIds(), orphans, refs, ROOT, SCAN_DIRS, sdd, SKIP_PATHS (+2 more)

### Community 54 - "mergeAsAltSource"
Cohesion: 0.20
Nodes (10): AD32: Same-story dedup uses Workers AI embeddings + Vectorize, not LLM finalize call, AD34: LLM same-event rerank for borderline cosine pairs, AD39: Raise dedup auto-merge threshold to 0.88 and gate merges to a 72h news-cycle window, AD41: Bidirectional finalize merge + automatic post-tick dedup sweep, POST /api/admin/historical-dedup, buildMergeStatements(), FinalizeRow, mergeAsAltSource() (+2 more)

### Community 55 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, deploy, dev, fixtures, icons, knip, lint (+6 more)

### Community 56 - "Reading Experience"
Cohesion: 0.14
Nodes (14): Reading Experience, REQ-READ-001: Overview grid of today's digest, REQ-READ-002: Article detail view rendering, REQ-READ-003: Read tracking, REQ-READ-005: Empty dashboard state, REQ-READ-006: Empty, error, and offline pages, REQ-READ-007: Tag railing reorder animation, REQ-READ-008: Tag railing scroll, wrap, and fallback (+6 more)

### Community 57 - "generateUlid"
Cohesion: 0.24
Nodes (9): findRecentRunningRun(), kickCoordinator(), RecentRun, tryClaimDispatch(), encodeRandom(), encodeTime(), generateUlid(), DevEnv (+1 more)

### Community 58 - "SESSION_COOKIE_NAME"
Cohesion: 0.21
Nodes (9): base64UrlEncode(), enc, RFC-6265, SESSION_COOKIE_NAME, FakeContext, makeAccessJwt(), makeContext(), makeDb() (+1 more)

### Community 59 - "security-headers.ts"
Cohesion: 0.26
Nodes (10): CSP_HEADER_VALUE, HSTS_HEADER_VALUE, PERMISSIONS_POLICY_VALUE, REFERRER_POLICY_VALUE, SECURITY_HEADERS, securityHeadersMiddleware(), X_CONTENT_TYPE_OPTIONS_VALUE, X_FRAME_OPTIONS_VALUE (+2 more)

### Community 60 - "feed.test.ts"
Cohesion: 0.15
Nodes (7): authedRequest(), MockOpts, RawArticle, ScrapeRunRow, UserRow, WireArticle, WireResponse

### Community 61 - "sources-cache.ts"
Cohesion: 0.29
Nodes (8): AD16: Single-writer invariant for KV `sources:{tag}` enforced via centralised helper, key(), serialize(), sourcesCacheRawEqual(), writeSourcesCache(), DiscoveredFeed, SourcesCacheValue, applyEvictions()

### Community 62 - "sdd/README.md"
Cohesion: 0.20
Nodes (4): Glossary, Rate Limits, REQ-RATE-001: Application-layer rate limits on the auth and mutation surface, Review Queue

### Community 64 - "Authentication"
Cohesion: 0.17
Nodes (12): Authentication, REQ-AUTH-001: Sign in with a federated identity provider, REQ-AUTH-002: Access token + refresh token, instant revocation, REQ-AUTH-003: CSRF defense for state-changing endpoints, REQ-AUTH-004: OAuth error surfacing, REQ-AUTH-005: Account deletion, REQ-AUTH-006: Admin surface gating, REQ-AUTH-007: Cross-provider account dedup (+4 more)

### Community 65 - "check-wrangler-vars-parity.mjs"
Cohesion: 0.22
Nodes (7): here, integ, onlyInInteg, onlyInProd, prod, text, tomlPath

### Community 66 - "generate-pwa-icons.mjs"
Cohesion: 0.20
Nodes (8): @resvg/resvg-js, iconsDir, repoRoot, scriptDir, sizes, svgFlat, svgPath, svgRaw

### Community 67 - "Observability"
Cohesion: 0.17
Nodes (12): Observability, REQ-OPS-001: Structured JSON logging, REQ-OPS-002: Sanitized error surfaces, REQ-OPS-003: Content-Security-Policy on every response, REQ-OPS-004: Crawler policy and public-surface discoverability, REQ-OPS-005: Admin force-refresh endpoint, REQ-OPS-006: Integration deployment target, REQ-OPS-007: Public sitemap for crawler discovery (+4 more)

### Community 68 - "dedupe.ts"
Cohesion: 0.30
Nodes (10): Candidate, Cluster, clusterByCanonical(), isDefined(), mergeClusters(), mergeClustersByLlmHints(), pickEarliest(), Survivor (+2 more)

### Community 69 - "delete-initial.test.ts"
Cohesion: 0.21
Nodes (4): DEFAULT_HASHTAGS, DELETE_ALL_TAGS_LABEL, signedCookie(), UserRow

### Community 70 - "queue-handler.ts"
Cohesion: 0.18
Nodes (7): BatchHandlerOptions, NonRetryableError, QueueMessageContext, readMaxQueueAttempts(), FakeBody, fakeEnv, { mockLog }

### Community 71 - "embed-backfill.test.ts"
Cohesion: 0.26
Nodes (11): POST(), ADMIN_USER_ROW, adminCookieJwt(), buildContextAndCall(), BuildContextOpts, DbFixture, makeAi(), makeDb() (+3 more)

### Community 72 - "alt-sources-modal.ts"
Cohesion: 0.38
Nodes (10): applyAnchorOrCentre(), getDialog(), initModal(), onCloseClick(), onDialogClick(), onTriggerClick(), positionAnchored(), teardownModal() (+2 more)

### Community 73 - "retry-bulk-endpoint.test.ts"
Cohesion: 0.17
Nodes (4): KvHandles, SqlBinding, UserRow, validSessionCookie()

### Community 74 - "history/api.test.ts"
Cohesion: 0.17
Nodes (4): ArticleRow, authedToken(), ScrapeRunRow, UserRow

### Community 75 - "stats.test.ts"
Cohesion: 0.18
Nodes (6): authedRequest(), Binding, formatInt(), formatReadOfTotal(), Responses, UserRow

### Community 76 - "force-refresh.test.ts"
Cohesion: 0.18
Nodes (7): ADMIN_USER_ROW, adminCookieJwt(), AdminSessionFixture, DbFixture, PreparedStmt, QueueFixture, refreshRequest()

### Community 77 - "0001_initial.sql"
Cohesion: 0.09
Nodes (33): articles, digests, idx_articles_digest_rank, idx_articles_digest_slug, idx_articles_read, idx_digests_status, idx_digests_user_date, idx_digests_user_generated (+25 more)

### Community 78 - "Non-Functional Requirements"
Cohesion: 0.18
Nodes (11): CON-A11Y-001: Accessibility minimum, CON-AUTH-001: Custom federated OAuth/OIDC + HMAC-SHA256 JWT, CON-COST-001: Target monthly cost ≈ $42 at 100 users, CON-DATA-001: Strong consistency in D1, edge cache in KV, CON-LLM-001: Centralized deterministic prompts, CON-PERF-001: 100-user thundering-herd target, CON-SEC-001: Strict content security policy, CON-SEC-002: Outbound article-body fetches flow through the SSRF-guarded helper (+3 more)

### Community 79 - "design.md"
Cohesion: 0.18
Nodes (9): Design System, REQ-DES-001: Swiss-minimal visual language, REQ-DES-002: Light and dark mode with no flash, REQ-DES-003: Deliberate motion system, REQ-DES-004: Mobile and PWA no-flash chrome, PWA & Mobile, REQ-PWA-001: Installable PWA manifest, REQ-PWA-003: Mobile-first responsive layout (+1 more)

### Community 80 - "Onboarding & Settings"
Cohesion: 0.18
Nodes (11): Onboarding & Settings, REQ-SET-001: Unified first-run and edit flow, REQ-SET-002: Hashtag curation strip UX, REQ-SET-003: Scheduled digest time with timezone, REQ-SET-004: Model selection, REQ-SET-005: Email notification preference, REQ-SET-006: Settings-incomplete gate, REQ-SET-007: Timezone change detection (+3 more)

### Community 81 - "DigestCard.astro"
Cohesion: 0.22
Nodes (7): altLabel, displaySourceName, Props, stagger, tagAttr, AltSourceLabel, formatAltSourceLabel()

### Community 82 - "lib/embed-backfill.ts"
Cohesion: 0.24
Nodes (7): ArticleRow, BATCH_SIZE, BatchResult, countRemaining(), runOneBackfillBatch(), embedTexts(), DbCalls

### Community 83 - "e2e-test.sh"
Cohesion: 0.70
Nodes (4): check(), check_body(), curl_status(), e2e-test.sh script

### Community 84 - "dedup-diag.test.ts"
Cohesion: 0.24
Nodes (10): ADMIN_USER_ROW, adminCookieJwt(), ArticleRow, callGet(), CallOpts, DbFixture, makeDb(), makeVectorize() (+2 more)

### Community 85 - "Endpoints"
Cohesion: 0.20
Nodes (10): Endpoints, GET /api/admin/dedup-diag, GET /api/admin/dedup-status, GET /api/admin/discovery/retry-bulk, GET /api/admin/embed-backfill, GET /api/admin/force-refresh, GET /api/admin/pipeline-status, POST /api/admin/discovery/retry-bulk (+2 more)

### Community 86 - "Deployment"
Cohesion: 0.20
Nodes (10): Cloudflare Resources, Contents, Dependency Automation, Deployment, Local Development, PR Checks — CI gates (`test.yml`), Prerequisites, Related Documentation (+2 more)

### Community 87 - "ref_node_path"
Cohesion: 0.14
Nodes (10): @cloudflare/vitest-pool-workers, esbuild, entries, repoRoot, scriptDir, sources, astroEntry, __dirname (+2 more)

### Community 88 - "Source Discovery"
Cohesion: 0.20
Nodes (10): REQ-DISC-001: Per-tag feed discovery queueing and pickup, REQ-DISC-002: Discovery progress visibility, REQ-DISC-003: Self-healing feed health tracking, REQ-DISC-004: Manual re-discover UI surface, REQ-DISC-005: Discovery prompt injection protection, REQ-DISC-006: Stuck-tag retention, REQ-DISC-007: Per-tag feed discovery execution and persistence, REQ-DISC-008: Manual re-discover endpoint contract (+2 more)

### Community 89 - "stats.ts"
Cohesion: 0.24
Nodes (7): defaultStats, formatInt(), formatReadOfTotal(), StatsResponse, CountRow, GET(), SumRow

### Community 90 - "set-tz.test.ts"
Cohesion: 0.22
Nodes (3): env(), makeKvStub(), UserRow

### Community 91 - "src/env.d.ts"
Cohesion: 0.40
Nodes (4): App, Env, Locals, Runtime

### Community 92 - "install-prompt.ts"
Cohesion: 0.31
Nodes (7): IosNavigatorLike, isIos(), BeforeInstallPromptEvent, initInstallPrompt(), IosNavigator, isIos(), isStandalone()

### Community 94 - "callback-google.test.ts"
Cohesion: 0.24
Nodes (4): GOOGLE_STATE_COOKIE, googleClaims(), makeIdToken(), mockGoogleFetch()

### Community 95 - "Conventions"
Cohesion: 0.22
Nodes (9): Admin / Operator API Reference, Bearer / Origin bypass, Canonical vocabulary, Contents, Conventions, Error envelope, Related Documentation, Sec-Fetch-Site guard on admin GET callbacks (+1 more)

### Community 96 - "Observability"
Cohesion: 0.22
Nodes (9): Contents, Digest generation chunk status fields, Error detail field, Event enum, Observability, Rate-limiter atomicity and the WAF backstop, Refresh rate-limit fail-mode fields, Related Documentation (+1 more)

### Community 97 - "auth/account.ts"
Cohesion: 0.33
Nodes (6): zod, AccountDeleteBodySchema, DELETE(), deleteAccountCore(), deleteUserKvEntries(), POST()

### Community 98 - "blocked-publishers.ts"
Cohesion: 0.42
Nodes (6): BLOCKED_HOSTS, BLOCKED_NAME_TOKENS, filterBlockedPublishers(), hostIsBlocked(), isBlockedPublisher(), textHasBlockedToken()

### Community 99 - "scrape-finalize-consumer.ts"
Cohesion: 0.14
Nodes (16): AD45: Accepted orchestration-file sizes (coordinator, chunk-consumer, settings.astro), applyForeignKeysPragma(), ArticleRow, AutoCandidate, autoSweepLookbackSeconds(), BorderCandidate, enqueueAutoSweep(), FinalizeJobMessage (+8 more)

### Community 100 - "historical-dedup.test.ts"
Cohesion: 0.31
Nodes (8): ADMIN_USER_ROW, adminCookieJwt(), CallOpts, callRoute(), DbCalls, makeDb(), makeQueue(), QueueSends

### Community 101 - "package.json"
Cohesion: 0.11
Nodes (17): config, name, private, type, version, @astrojs/check, @astrojs/cloudflare, @cloudflare/workers-types (+9 more)

### Community 111 - "finalize-vectorize.test.ts"
Cohesion: 0.25
Nodes (6): DbCall, makeEnv(), makeMockSweepQueue(), MockDb, MockSweepQueue, MockVectorize

### Community 113 - "fetch"
Cohesion: 0.25
Nodes (8): AD38: CF Access-protected admin endpoints must be invoked via top-level navigation, not fetch(), GET /api/admin/pipeline-run, POST /api/admin/discovery/retry, Integration deployment, Boundaries, Constraints, Technology Stack, fetch()

### Community 114 - "pipeline-status.ts"
Cohesion: 0.29
Nodes (7): DedupRow, GET(), jsonResponse(), PipelineRunRow, ScrapeRow, StatusError, StatusSuccess

### Community 115 - "chunk-consumer.test.ts"
Cohesion: 0.25
Nodes (3): ChunkJobMessage, KvState, SqlRecord

### Community 116 - "discovery-status.test.ts"
Cohesion: 0.29
Nodes (3): env(), makeKvStub(), UserRow

### Community 117 - "rules"
Cohesion: 0.29
Nodes (6): ignorePatterns, rules, no-console, no-unused-vars, typescript/no-explicit-any, $schema

### Community 118 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, astro, @astrojs/cloudflare, fast-xml-parser, tailwindcss, @tailwindcss/vite, zod

### Community 119 - "manifest.test.ts"
Cohesion: 0.29
Nodes (3): manifest, ManifestIcon, WebManifest

### Community 122 - "ref_node_fs"
Cohesion: 0.10
Nodes (9): @playwright/test, StorageStateShape, StorageStateShape, ensureDir(), globalSetup(), StorageStateShape, StorageStateShape, StorageStateShape (+1 more)

### Community 124 - "pipeline-run.test.ts"
Cohesion: 0.43
Nodes (6): ADMIN_USER_ROW, adminCookieJwt(), callRoute(), DbCalls, makeDb(), makeQueue()

### Community 126 - "buildEmbeddingInput"
Cohesion: 0.33
Nodes (6): AD33: Embed source-text and apply a same-vendor cosine penalty, AD42: Bidirectional historical-dedup + sweep cursor aligned with time window + multi-rerank, POST /api/admin/embed-backfill, 4.5 Worker, Queue, and Migrations, buildEmbeddingInput(), self()

### Community 127 - "Admin-only routes (Cloudflare Access gating)"
Cohesion: 0.33
Nodes (6): Admin-only routes (Cloudflare Access gating), Browser invocation pattern for Access-gated endpoints, Dev-bypass runbook (integration only), Paths to gate, Setting `CF_ACCESS_AUD` and the `*.workers.dev` perimeter (production), Setup (one-time, operator console)

### Community 128 - "Spec Changes — Archive (April 2026)"
Cohesion: 0.33
Nodes (6): 2026-04-22, 2026-04-23, 2026-04-24, 2026-04-25, 2026-04-26, Spec Changes — Archive (April 2026)

### Community 129 - "canonical-url.ts"
Cohesion: 0.47
Nodes (4): canonicalize(), isTrackingParam(), TRACKING_PARAM_EXACT, TRACKING_PARAM_PREFIXES

### Community 131 - "PWA icons"
Cohesion: 0.50
Nodes (3): Current assets, PWA icons, Updating the icon

### Community 132 - "CF-003 at `src/pages/api/admin/embed-backfill.ts:69`, `src/pages/api/admin/historical-dedup.ts:118`, `src/pages/api/admin/discovery/retry.ts:93`, `src/pages/api/admin/discovery/retry-bulk.ts:155` (Missing rate limiting / cost amplification)"
Cohesion: 0.50
Nodes (3): CF-003 at `src/pages/api/admin/embed-backfill.ts:69`, `src/pages/api/admin/historical-dedup.ts:118`, `src/pages/api/admin/discovery/retry.ts:93`, `src/pages/api/admin/discovery/retry-bulk.ts:155` (Missing rate limiting / cost amplification), Cycle 1 - 2026-06-15, Review Decisions

### Community 133 - "Email Notifications"
Cohesion: 0.50
Nodes (4): Email Notifications, REQ-MAIL-001: Digest-ready email content, REQ-MAIL-002: Non-blocking email failure, REQ-MAIL-003: Digest-ready email send policy

### Community 134 - "History & Stats"
Cohesion: 0.50
Nodes (4): History & Stats, REQ-HIST-001: Day-grouped article history, REQ-HIST-002: User stats widget, REQ-HIST-003: Search, tag filter, and deep-link on /history

### Community 141 - "Content sources"
Cohesion: 0.13
Nodes (15): Content sources, Cron/queue race prevention, Discovery flow, Dynamic tag-specific source discovery, Error handling, First digest after adding a new tag, `generateDigest(user, trigger, digestId?)` — the one function, Generic sources — run for every hashtag (+7 more)

### Community 150 - "news-digest — requirements (historical)"
Cohesion: 0.20
Nodes (10): Cost and time transparency, Deployment, History pagination, How it works, news-digest — requirements (historical), Observability, Scaffolding order, Security headers (+2 more)

### Community 152 - "News Digest — curated by an LLM"
Cohesion: 0.25
Nodes (8): Built with Codeflare's spec-driven development framework, License, Local dev, News Digest — curated by an LLM, Stack, What's in it, What's *not* in it, Why

### Community 153 - "news-digest — Product Specification"
Cohesion: 0.22
Nodes (9): Actors, Canonical Spec Layout, Design Principles, Documentation, news-digest — Product Specification, Out of Scope, Requirement Domains, Support Files (+1 more)

### Community 156 - "Operational TODOs"
Cohesion: 0.25
Nodes (7): 12 curated source URLs currently 4xx, Hardcoded sitemap origin in robots.txt / llms.txt, Operational TODOs, Partial REQs with deferred scope, Pending Work, REQ-SET-008 AC 4 — `POST /api/tags/restore` server behaviour, Test-name migration after auth domain split

### Community 157 - "Motion & polish"
Cohesion: 0.25
Nodes (8): Cascading content reveals, Cut from scope (previously specified, removed as decorative), First-run choreography, Foundations, Micro-interactions, Motion & polish, Page transitions, Skeleton loaders (LLM generation)

### Community 159 - "news-digest — Documentation"
Cohesion: 0.33
Nodes (6): Canonical Documentation Layout, Decision and Support Files, Glossary, Implementation Lanes, news-digest — Documentation, Related Documentation

### Community 161 - "HTTP API"
Cohesion: 0.33
Nodes (6): Auth, Client-side polling during generation, Digest and refresh, History and stats, HTTP API, Settings

### Community 162 - "Email notifications (Resend)"
Cohesion: 0.33
Nodes (6): Email notifications (Resend), Email template, Resend call, Secrets, Sender domain, When it fires

### Community 163 - "Security Policy"
Cohesion: 0.40
Nodes (5): Reporting a Vulnerability, Security Policy, Supported Versions, What's in scope, What's out of scope

### Community 165 - "Migrations"
Cohesion: 0.40
Nodes (4): Adding a new migration, Historical context (CF-020 reverted), Migration index, Migrations

### Community 166 - "LLM prompts"
Cohesion: 0.40
Nodes (5): Digest generation prompt, Inference parameters (shared), LLM prompts, Source discovery prompt, Why a single file

### Community 171 - "User stats widget"
Cohesion: 0.50
Nodes (4): My take on this requirement, Tracking "read", User stats widget, Widget implementation

### Community 173 - "Scale and tradeoffs"
Cohesion: 0.67
Nodes (3): Known tradeoffs (accepted), Scale and tradeoffs, What's sized for 100-user scale

## Knowledge Gaps
- **800 isolated node(s):** `validate-app-url.sh script`, `config`, `_merge_email_winners`, `_merge_user_merges`, `$schema` (+795 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1104 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `sources.ts`, `settings.astro`, `canonical-url.ts`, `[provider]/login.ts`, `discovery.ts`, `worker.ts`, `dedup-sweep-consumer.test.ts`, `refresh-gone.test.ts`, `signSession`, `errors.ts`, `rate-limited.ts`, `auth/refresh.ts`, `data.test.ts`, `callback.ts`, `scrape-chunk-consumer.ts`, `scrape-coordinator.ts`, `cleanup.test.ts`, `errorResponse`, `lib/historical-dedup.ts`, `Base.astro`, `auth.ts`, `[slug].astro`, `rediscovery-lifecycle.test.ts`, `originOf`, `integration.test.ts`, `dedup-diag.ts`, `log`, `digest.astro`, `session-jwt.ts`, `email.ts`, `cron.test.ts`, `dedup-rerank.ts`, `4.2 Libraries (`src/lib/`)`, `email-dispatch.ts`, `bundled/theme-toggle.ts`, `history.astro`, `cloudflare-test.ts`, `bidirectional-dedup.ts`, `crawler-policy.test.ts`, `types.ts`, `mergeAsAltSource`, `generateUlid`, `SESSION_COOKIE_NAME`, `security-headers.ts`, `feed.test.ts`, `sources-cache.ts`, `tag-railing-flip.test.ts`, `dedupe.ts`, `delete-initial.test.ts`, `queue-handler.ts`, `embed-backfill.test.ts`, `alt-sources-modal.ts`, `retry-bulk-endpoint.test.ts`, `history/api.test.ts`, `stats.test.ts`, `force-refresh.test.ts`, `DigestCard.astro`, `lib/embed-backfill.ts`, `dedup-diag.test.ts`, `ref_node_path`, `set-tz.test.ts`, `install-prompt.ts`, `account.test.ts`, `callback-google.test.ts`, `blocked-publishers.ts`, `scrape-finalize-consumer.ts`, `historical-dedup.test.ts`, `package.json`, `coordinator.test.ts`, `finalize-vectorize.test.ts`, `chunk-consumer.test.ts`, `discovery-status.test.ts`, `manifest.test.ts`, `pipeline-run.test.ts`, `logout.test.ts`?**
  _High betweenness centrality (0.265) - this node is a cross-community bridge._
- **Why does `log()` connect `log` to `sources.ts`, `worker.ts`, `discovery.ts`, `errors.ts`, `scrape-coordinator.ts`, `auth/refresh.ts`, `callback.ts`, `scrape-chunk-consumer.ts`, `cleanup.test.ts`, `errorResponse`, `lib/historical-dedup.ts`, `enforceRateLimit`, `auth.ts`, `rediscovery-lifecycle.test.ts`, `originOf`, `integration.test.ts`, `dedup-diag.ts`, `session-jwt.ts`, `email.ts`, `cron.test.ts`, `dedup-rerank.ts`, `4.2 Libraries (`src/lib/`)`, `email-dispatch.ts`, `api/settings.ts`, `pipeline-consumer.ts`, `generateUlid`, `sources-cache.ts`, `queue-handler.ts`, `lib/embed-backfill.ts`, `stats.ts`, `Observability`, `auth/account.ts`, `scrape-finalize-consumer.ts`, `pipeline-status.ts`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `Observability` connect `Observability` to `architecture.md`, `log`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `log()` (e.g. with `Event envelope` and `Related Documentation`) actually correct?**
  _`log()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `validate-app-url.sh script`, `config`, `_merge_email_winners` to the rest of the system?**
  _800 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sources.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06506849315068493 - nodes in this community are weakly interconnected._
- **Should `settings.astro` be split into smaller, more focused modules?**
  _Cohesion score 0.050724637681159424 - nodes in this community are weakly interconnected._