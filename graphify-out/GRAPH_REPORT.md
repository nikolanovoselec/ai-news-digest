# Graph Report - ai-news-digest  (2026-10-14)

## Corpus Check
- 349 files · ~464,413 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .toml 2, .example 1)

## Summary
- 2378 nodes · 5074 edges · 171 communities (138 shown, 33 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb8fc769`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sources.ts
- oauth-providers.ts
- discovery.ts
- cleanup.test.ts
- requireAdminSession
- Base.astro
- 0001_initial.sql
- settings.astro
- scrape-coordinator.ts
- auth.ts
- digest-page.ts
- digest-today.ts
- log.ts
- signSession
- scrape-chunk-consumer.ts
- Product Changes
- history.ts
- llm-json.ts
- [slug].astro
- callback.ts
- rediscovery-lifecycle.test.ts
- log
- email-dispatch.ts
- compilerOptions
- digest.astro
- admin/embed-backfill.ts
- email.ts
- dedup-diag.ts
- chunk-summary-length.test.ts
- package.json
- tag-railing-flip.test.ts
- jwt-secret.ts
- prompts.ts
- feed.test.ts
- dedup-rerank.ts
- card-interactions.ts
- Historical index labels and dates
- generateUlid
- dedup-diag.test.ts
- curated-sources.ts
- bundled/theme-toggle.ts
- worker.ts
- history.astro
- 4.2 Libraries (`src/lib/`)
- Headline
- page-effects.ts
- security-headers.test.ts
- ref_node_fs
- API Reference
- retry.ts
- devDependencies
- scripts
- crawler-policy.test.ts
- cleanup.ts
- check-wrangler-vars-parity.mjs
- check-req-backlinks.mjs
- check-no-page-pattern-b.mjs
- dedupe.ts
- dedup-sweep-consumer.ts
- embed-backfill.test.ts
- alt-sources-modal.ts
- retry-bulk-endpoint.test.ts
- Spec Changes
- stats.test.ts
- force-refresh.test.ts
- DigestCard.astro
- Architecture
- types.ts
- lib/historical-dedup.ts
- check-deploy-config.mjs
- generate-pwa-icons.mjs
- set-tz.test.ts
- install-prompt.ts
- admin/historical-dedup.ts
- logout.test.ts
- auth/account.ts
- Digest Generation
- mergeAsAltSource
- coordinator.test.ts
- finalize-vectorize.test.ts
- src/env.d.ts
- Configuration
- scrape-finalize-consumer.ts
- discovery-status.test.ts
- rules
- dependencies
- manifest.test.ts
- generate.ts
- tests/env.d.ts
- canonical-url.ts
- refresh-gone.test.ts
- rate-limited.ts
- pipeline-run.ts
- 0007_scrape_chunk_completions.sql
- idx_articles_embedding_status
- 0013_dedup_runs.sql
- 0014_pipeline_runs.sql
- initFooterScramble
- vitest
- sdd/README.md
- Authentication
- article-detail.ts
- validate-app-url.sh
- Endpoints
- Deployment
- main
- Content sources
- blocked-publishers.ts
- Non-Functional Requirements
- Reading Experience
- fetch
- Authentication
- Observability
- pwa.md
- Onboarding & Settings
- trigger-scrape.ts
- Conventions
- news-digest - requirements (historical)
- Source Discovery
- pipeline-status.ts
- retry-endpoint.test.ts
- chunk-consumer.test.ts
- News Digest - curated by an LLM
- news-digest - Product Specification
- Operational TODOs
- Motion & polish
- process-pending.test.ts
- dispatch-failure.test.ts
- Admin-only routes (Cloudflare Access gating)
- 4. Source Module Map
- news-digest - Documentation
- HTTP API
- Email notifications (Resend)
- Spec Changes - Archive (April 2026)
- SDD Review Queue
- retry-bulk.ts
- Architecture Decision Records
- Migrations
- LLM prompts
- schema-0005.test.ts
- PWA icons
- User stats widget
- Email Notifications
- History & Stats
- Scale and tradeoffs
- .doc-coverage.md
- Rate Limits
- Digests
- Settings
- SEO and Crawler Policy
- Security Policy
- oauth-errors.ts
- Disposition
- schema-0003.test.ts
- Pages
- Tags
- loadStarredPayload
- .review-decisions.md

## God Nodes (most connected - your core abstractions)
1. `log()` - 158 edges
2. `vitest` - 131 edges
3. `Historical index labels and dates` - 65 edges
4. `signSession()` - 51 edges
5. `errorResponse()` - 48 edges
6. `originOf()` - 41 edges
7. `enforceRateLimit()` - 36 edges
8. `astro` - 35 edges
9. `checkOrigin()` - 32 edges
10. `requireAdminSession()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `PR Checks - CI gates (`test.yml`)` --references--> `main()`  [INFERRED]
  documentation/lanes/deployment.md → scripts/validate-curated-sources.mjs
- `Supported Versions` --references--> `main()`  [INFERRED]
  SECURITY.md → scripts/validate-curated-sources.mjs
- `AD24: Single OAUTH_JWT_SECRET for both session signing and CSRF state` --references--> `verifyHmacSignature()`  [INFERRED]
  documentation/decisions/README.md → src/lib/crypto.ts
- `Worker Vars (non-secret)` --references--> `readCosineThreshold()`  [INFERRED]
  documentation/lanes/configuration.md → src/lib/embeddings.ts
- `POST /api/admin/historical-dedup` --references--> `mergeAsAltSource()`  [INFERRED]
  documentation/lanes/api-reference-admin.md → src/lib/finalize-merge.ts

## Import Cycles
- None detected.

## Communities (171 total, 33 thin omitted)

### Community 0 - "sources.ts"
Cohesion: 0.06
Nodes (60): RFC-2822, AD22: SSRF defence relies on Workers network sandbox; static IP allowlist is best-effort only, AD59: Forced and portal-like candidate fetch with deterministic non-article drop, 5.1 Global-feed pipeline (every 4 hours), ArticleBodyResult, extractArticleText(), fetchArticleBodies(), fetchArticleBodiesWithQuality() (+52 more)

### Community 1 - "oauth-providers.ts"
Cohesion: 0.05
Nodes (39): RFC-7517, Admin endpoint cross-site guards, Admin gate and JWT exp validation, Auth cookie policy, Content-Security-Policy, Contents, Dev-bypass prod guard, Google id_token RS256 verification (+31 more)

### Community 2 - "discovery.ts"
Cohesion: 0.11
Nodes (13): asArray(), contentTypeMatches(), discoverTag(), hasJsonItem(), hasXmlItem(), itemHasTitleAndLink(), LLMDiscoveryPayload, narrowDiscoveryPayload() (+5 more)

### Community 3 - "cleanup.test.ts"
Cohesion: 0.16
Nodes (9): articleExists(), clearKvPrefix(), countRows(), daysAgo(), insertChunkCompletion(), insertStar(), insertUser(), listKvKeys() (+1 more)

### Community 4 - "requireAdminSession"
Cohesion: 0.17
Nodes (14): AD25: Cloudflare Access JWT signature unverified server-side; trust Access edge, AD29: Cloudflare Access is opt-in additive perimeter; ADMIN_EMAIL gates admin alone, AD44: Cloudflare Access JWT `exp` validation; signature still trusted from the perimeter, AccessJwtClaims, AdminAuthResult, audMatches(), decodeAccessJwt(), isAccessJwtClaims() (+6 more)

### Community 5 - "Base.astro"
Cohesion: 0.08
Nodes (11): Props, Props, normalizedEmail, Props, cookieTheme, Props, safeJsonLd(), hours (+3 more)

### Community 6 - "0001_initial.sql"
Cohesion: 0.09
Nodes (33): articles, digests, idx_articles_digest_rank, idx_articles_digest_slug, idx_articles_read, idx_digests_status, idx_digests_user_date, idx_digests_user_generated (+25 more)

### Community 7 - "settings.astro"
Cohesion: 0.07
Nodes (34): Props, defaultStats, formatInt(), formatReadOfTotal(), StatsResponse, DEFAULT_HASHTAGS, DELETE_ALL_TAGS_LABEL, clearPipelineState() (+26 more)

### Community 8 - "scrape-coordinator.ts"
Cohesion: 0.11
Nodes (31): loadExistingCanonicalToIdMap(), loadExistingCanonicalUrls(), updateChunkCount(), SourceAdapter, SNIPPET_FLOOR, applyPreferDirectOverGoogleNews(), buildCandidates(), capChunks() (+23 more)

### Community 9 - "auth.ts"
Cohesion: 0.08
Nodes (46): hexEncode(), readCookie(), verifyHmacSignature(), buildRefreshCookie(), deviceFingerprint(), findRefreshToken(), findUnrevokedChild(), generateRefreshTokenValue() (+38 more)

### Community 10 - "digest-page.ts"
Cohesion: 0.12
Nodes (28): animateStripScrollTo(), armScrollDownReveal(), FlipChipOptions, flipChipToFront(), flipChipToPosition(), isFlipLocked(), formatCountdown(), init() (+20 more)

### Community 11 - "digest-today.ts"
Cohesion: 0.20
Nodes (10): ArticleRow, computeNextScrapeAt(), loadTodayPayload(), ScrapeRunRow, TodayResponse, WireArticle, slugify(), stripHyphens() (+2 more)

### Community 12 - "log.ts"
Cohesion: 0.09
Nodes (52): astro, DEFAULT_STATUS, errorResponse(), USER_FACING_MESSAGES, HASHTAG_REGEX, MAX_HASHTAGS, parseHashtags(), LogRecord (+44 more)

### Community 13 - "signSession"
Cohesion: 0.04
Nodes (38): base64UrlDecode(), base64UrlEncode(), enc, RFC-6265, getHmacKey(), HEADER_B64, isSessionClaims(), JWT_CLOCK_SKEW_SECONDS (+30 more)

### Community 14 - "scrape-chunk-consumer.ts"
Cohesion: 0.13
Nodes (24): applyForeignKeysPragma(), normalizeHashtag(), splitIntoParagraphs(), alignLlmArticlesToInputs(), buildAnchorIndices(), buildArticleBatchStatements(), contextualTagSetForCluster(), countModelEmittedTags() (+16 more)

### Community 15 - "Product Changes"
Cohesion: 0.09
Nodes (22): 2026-04-27, 2026-04-28, 2026-04-29, 2026-05-03, 2026-05-04, 2026-05-05, 2026-05-06, 2026-05-07 (+14 more)

### Community 16 - "history.ts"
Cohesion: 0.11
Nodes (11): ArticleRow, DayGroup, GET(), HistoryResponse, ScrapeRunRow, upsertDay(), WireTick, ArticleRow (+3 more)

### Community 17 - "llm-json.ts"
Cohesion: 0.13
Nodes (23): AD34: LLM same-event rerank for borderline cosine pairs, AD57: AI Gateway dynamic route for pipeline model control, AIRunResponse, extractResponsePayload(), extractTokensIn(), extractTokensOut(), AI_GATEWAY_MODEL_PREFIXES, AiBinding (+15 more)

### Community 18 - "[slug].astro"
Cohesion: 0.09
Nodes (20): MONTHS, primaryFormatted, primaryIso, Props, safeHref(), localeForTz(), AltSourceRow, altSources (+12 more)

### Community 19 - "callback.ts"
Cohesion: 0.08
Nodes (36): ExistingUserRow, providerByName(), ProviderConfig, userIdFor(), clientIp(), rateLimitResponse(), CallbackEnv, errorRedirect() (+28 more)

### Community 20 - "rediscovery-lifecycle.test.ts"
Cohesion: 0.11
Nodes (10): clearHealth(), CONSECUTIVE_FETCH_FAILURE_LIMIT, FeedHealthResult, healthKey(), recordFetchResult(), E2E_USER_ID, SYSTEM_USER_ID, KvStub (+2 more)

### Community 21 - "log"
Cohesion: 0.27
Nodes (17): countChunkCompletions(), recordChunkCompletion(), log(), advancePhase(), handlePipelineJobsBatch(), markFailed(), PipelineRunRow, processOnePipelineMessage() (+9 more)

### Community 22 - "email-dispatch.ts"
Cohesion: 0.12
Nodes (18): mapConcurrent(), selectUnreadHeadlinesForUser(), tagTallySinceMidnight(), dispatchDailyEmails(), dispatchForTz(), DispatchUserRow, loadDispatchUsers(), processOneUser() (+10 more)

### Community 23 - "compilerOptions"
Cohesion: 0.09
Nodes (21): astro/tsconfigs/strict, compilerOptions, allowJs, baseUrl, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, jsx (+13 more)

### Community 24 - "digest.astro"
Cohesion: 0.10
Nodes (16): AuthenticatedUser, LoadSessionResult, PageSessionResult, redirect(), requireSettingsComplete(), gated, rawSelectedTags, selectedTagSet (+8 more)

### Community 25 - "admin/embed-backfill.ts"
Cohesion: 0.16
Nodes (12): AD48: Dedup cost reduction: borderline-rerank watermark + batched rerank call + pipeline-wide gpt-oss-20b, clearWatermark(), ArticleRow, BATCH_SIZE, BatchResult, countRemaining(), runOneBackfillBatch(), hasBearerAuth() (+4 more)

### Community 26 - "email.ts"
Cohesion: 0.12
Nodes (18): EmailHeadline, HeadlineRow, TagTally, TallyRow, TotalRow, DigestReadyEmailParams, escapeHtml(), headlineRow() (+10 more)

### Community 27 - "dedup-diag.ts"
Cohesion: 0.14
Nodes (24): AD33: Embed source-text and apply a same-vendor cosine penalty, POST /api/admin/embed-backfill, BgeRunResult, buildEmbeddingInput(), cosineSimilarity(), DEFAULT_COSINE_THRESHOLD, DEFAULT_HIGH_CONFIDENCE_COSINE, DEFAULT_SAME_VENDOR_PENALTY (+16 more)

### Community 28 - "chunk-summary-length.test.ts"
Cohesion: 0.16
Nodes (13): article(), ArticleRow, deliver(), Details, expectPersisted(), expectUsage(), GatewayReply, INITIAL_USAGE (+5 more)

### Community 29 - "package.json"
Cohesion: 0.11
Nodes (17): config, name, private, type, version, @astrojs/check, @astrojs/cloudflare, @cloudflare/workers-types (+9 more)

### Community 32 - "prompts.ts"
Cohesion: 0.18
Nodes (12): CHUNK_LLM_PARAMS, compactChunkBodySnippetForPrompt(), DISCOVERY_LLM_PARAMS, DISCOVERY_SYSTEM, discoveryUserPrompt(), LLM_BASE_PARAMS, PROCESS_CHUNK_SYSTEM, processChunkUserPrompt() (+4 more)

### Community 33 - "feed.test.ts"
Cohesion: 0.15
Nodes (7): authedRequest(), MockOpts, RawArticle, ScrapeRunRow, UserRow, WireArticle, WireResponse

### Community 34 - "dedup-rerank.ts"
Cohesion: 0.15
Nodes (13): BatchPayload, BatchVerdictEntry, buildBatchUser(), DEFAULT_RERANK_FLOOR, narrowBatchPayload(), RERANK_BATCH_SIZE, RERANK_SYSTEM, RerankArticle (+5 more)

### Community 35 - "card-interactions.ts"
Cohesion: 0.22
Nodes (12): AD20: Idempotency tokens for client scripts loaded BOTH as Pattern B IIFE AND via page-level import must live on `window`, bindStarDelegation(), closeAllTagPopovers(), getBindFlags(), handleStarClick(), initCardInteractions(), popoverTimers, __resetForTests() (+4 more)

### Community 36 - "Historical index labels and dates"
Cohesion: 0.05
Nodes (43): AD10: Atomic conditional UPDATE as the once-per-run idempotency gate, AD11: Keep `style-src 'unsafe-inline'`; runtime `.style.X` writes are intentional, AD12: Integration env: separate Cloudflare resources, manual trigger from develop, crons disabled, AD13: No non-essential cookies (analytics gate), AD14: History-page perf-comparability test permanently skipped, AD17: Reject `dedupe-groups.ts` extraction, AD18: Reject `deferred-candidates.ts`; chunk-overflow path stays log-only, AD19: Reject `tag-railing-flip-core.ts`; FLIP measurements are not separable from DOM (+35 more)

### Community 37 - "generateUlid"
Cohesion: 0.27
Nodes (8): findRecentRunningRun(), kickCoordinator(), RecentRun, tryClaimDispatch(), DEFAULT_MODEL_ID, encodeRandom(), encodeTime(), generateUlid()

### Community 38 - "dedup-diag.test.ts"
Cohesion: 0.24
Nodes (10): ADMIN_USER_ROW, adminCookieJwt(), ArticleRow, callGet(), CallOpts, DbFixture, makeDb(), makeVectorize() (+2 more)

### Community 39 - "curated-sources.ts"
Cohesion: 0.15
Nodes (16): BRAND_ONLY_TAGS, CURATED_SOURCES, CURATED_TAGS, CuratedSource, CuratedSourceKind, GOOGLE_NEWS_CURATED_TAGS, googleNewsSourceForTag(), hasCuratedGoogleNews() (+8 more)

### Community 40 - "bundled/theme-toggle.ts"
Cohesion: 0.20
Nodes (13): applyHtmlBgInlineStyle(), applyMetaThemeColor(), applyTheme(), BG_BY_THEME, DATA_ATTR, nextTheme(), persistTheme(), persistThemeCookie() (+5 more)

### Community 41 - "worker.ts"
Cohesion: 0.11
Nodes (12): DedupSweepMessage, PipelineJobMessage, handleChunkBatch(), handleFinalizeBatch(), CRON_HANDLERS, queue(), scheduled(), QueueMock (+4 more)

### Community 42 - "history.astro"
Cohesion: 0.12
Nodes (12): Props, data, DayGroup, filteredArticles, HistoryResponse, initialSelectedTagSet, rawDateParam, rawTagsParam (+4 more)

### Community 43 - "4.2 Libraries (`src/lib/`)"
Cohesion: 0.20
Nodes (12): AD43: Shared per-match dedup classifier; outer control flow stays per-consumer, 4.2 Libraries (`src/lib/`), ClassifierParams, classifyMatchPair(), ClassifyOutcome, MatchInput, SelfArticle, AGGREGATOR_HOSTS (+4 more)

### Community 44 - "Headline"
Cohesion: 0.31
Nodes (8): isGoogleNewsUrl(), preferDirectOverGoogleNews(), sharedTitleTokenCount(), TITLE_STOPWORDS, titlesShareAnyToken(), tokenizeTitle(), Headline, googleNewsExistingTitleScore()

### Community 45 - "page-effects.ts"
Cohesion: 0.17
Nodes (11): BeforeSwapEvent, bindBrandLinkScrollToTop(), clearAllVtNames(), findPromotableCard(), KEY(), promoteIncomingCardForReturnMorph(), promoteSourceCardForOutgoingMorph(), restoreScroll() (+3 more)

### Community 46 - "security-headers.test.ts"
Cohesion: 0.23
Nodes (11): onRequest, CSP_HEADER_VALUE, HSTS_HEADER_VALUE, PERMISSIONS_POLICY_VALUE, REFERRER_POLICY_VALUE, SECURITY_HEADERS, securityHeadersMiddleware(), X_CONTENT_TYPE_OPTIONS_VALUE (+3 more)

### Community 47 - "ref_node_fs"
Cohesion: 0.25
Nodes (5): esbuild, entries, repoRoot, scriptDir, sources

### Community 48 - "API Reference"
Cohesion: 0.15
Nodes (13): API Reference, Contents, DELETE /api/articles/:id/star (Unstar article), Developer Tools, GET /api/history (Day-grouped article history), GET /api/starred (List starred articles), GET /api/stats (User stats widget), History and Stats (+5 more)

### Community 49 - "retry.ts"
Cohesion: 0.36
Nodes (6): parseJsonStringArray(), clearDiscoveryFailure(), DiscoveryRetryBodySchema, isFormEncoded(), POST(), userHashtagSet()

### Community 50 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @astrojs/check, @cloudflare/vitest-plugin, @cloudflare/workers-types, esbuild, knip, oxlint, @resvg/resvg-js (+5 more)

### Community 51 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, deploy, dev, fixtures, icons, knip, lint (+5 more)

### Community 53 - "cleanup.ts"
Cohesion: 0.28
Nodes (13): errMsg(), purgeOldRefreshTokens(), loadOwnedTags(), runArticleRetention(), runChunkCompletionsPurge(), runCleanup(), runOrphanScrapeRunSweep(), runOrphanTagSweep() (+5 more)

### Community 54 - "check-wrangler-vars-parity.mjs"
Cohesion: 0.17
Nodes (8): @cloudflare/vitest-plugin, here, integ, onlyInInteg, onlyInProd, prod, text, tomlPath

### Community 55 - "check-req-backlinks.mjs"
Cohesion: 0.20
Nodes (10): findAllRefs(), findSddIds(), orphans, refs, ROOT, SCAN_DIRS, sdd, SKIP_PATHS (+2 more)

### Community 56 - "check-no-page-pattern-b.mjs"
Cohesion: 0.21
Nodes (10): allOffenders, componentDir, componentOffenders, isTypeOnlyImport(), listAstroFiles(), pageOffenders, REPO_ROOT, report (+2 more)

### Community 57 - "dedupe.ts"
Cohesion: 0.23
Nodes (13): Candidate, Cluster, clusterByCanonical(), isDefined(), mergeClusters(), mergeClustersByLlmHints(), normaliseRawDedupGroups(), pickEarliest() (+5 more)

### Community 58 - "dedup-sweep-consumer.ts"
Cohesion: 0.11
Nodes (14): KV Key Conventions, Rate-limit rules, writeWatermark(), BatchHandlerOptions, handleBatch(), NonRetryableError, QueueMessageContext, readMaxQueueAttempts() (+6 more)

### Community 59 - "embed-backfill.test.ts"
Cohesion: 0.26
Nodes (11): POST(), ADMIN_USER_ROW, adminCookieJwt(), buildContextAndCall(), BuildContextOpts, DbFixture, makeAi(), makeDb() (+3 more)

### Community 60 - "alt-sources-modal.ts"
Cohesion: 0.38
Nodes (10): applyAnchorOrCentre(), getDialog(), initModal(), onCloseClick(), onDialogClick(), onTriggerClick(), positionAnchored(), teardownModal() (+2 more)

### Community 61 - "retry-bulk-endpoint.test.ts"
Cohesion: 0.17
Nodes (4): KvHandles, SqlBinding, UserRow, validSessionCookie()

### Community 62 - "Spec Changes"
Cohesion: 0.09
Nodes (23): 2026-04-27, 2026-04-28, 2026-04-29, 2026-05-03, 2026-05-04, 2026-05-05, 2026-05-06, 2026-05-07 (+15 more)

### Community 63 - "stats.test.ts"
Cohesion: 0.17
Nodes (7): GET(), authedRequest(), Binding, formatInt(), formatReadOfTotal(), Responses, UserRow

### Community 64 - "force-refresh.test.ts"
Cohesion: 0.18
Nodes (7): ADMIN_USER_ROW, adminCookieJwt(), AdminSessionFixture, DbFixture, PreparedStmt, QueueFixture, refreshRequest()

### Community 65 - "DigestCard.astro"
Cohesion: 0.22
Nodes (7): altLabel, displaySourceName, Props, stagger, tagAttr, AltSourceLabel, formatAltSourceLabel()

### Community 66 - "Architecture"
Cohesion: 0.06
Nodes (33): 1. Overview, 2. Components, 3. Repository Layout, 5.2 Operator force-refresh, 5.3 Daily retention (03:00 UTC), 5.4 Operator-triggered historical-dedup sweep, 5.5 Email dispatcher (every 5 minutes), 5. Request Lifecycles (+25 more)

### Community 67 - "types.ts"
Cohesion: 0.29
Nodes (8): AD16: Single-writer invariant for KV `sources:{tag}` enforced via centralised helper, key(), serialize(), sourcesCacheRawEqual(), writeSourcesCache(), DiscoveredFeed, SourcesCacheValue, applyEvictions()

### Community 68 - "lib/historical-dedup.ts"
Cohesion: 0.12
Nodes (20): AD35: Operator historical-dedup sweep self-chains via Cloudflare Queue, AD36: Lower dedup auto-merge threshold to 0.78 and remove the per-batch rerank cap, AD45: Accepted orchestration-file sizes (coordinator, chunk-consumer, settings.astro), readRerankFloor(), readWatermark(), ArticleRow, DedupBatchResult, runHistoricalDedupBatch() (+12 more)

### Community 69 - "check-deploy-config.mjs"
Cohesion: 0.20
Nodes (7): wrangler, built, configPath, redirect, redirectFile, relativePath, source

### Community 70 - "generate-pwa-icons.mjs"
Cohesion: 0.20
Nodes (8): @resvg/resvg-js, iconsDir, repoRoot, scriptDir, sizes, svgFlat, svgPath, svgRaw

### Community 71 - "set-tz.test.ts"
Cohesion: 0.22
Nodes (3): env(), makeKvStub(), UserRow

### Community 72 - "install-prompt.ts"
Cohesion: 0.31
Nodes (7): IosNavigatorLike, isIos(), BeforeInstallPromptEvent, initInstallPrompt(), IosNavigator, isIos(), isStandalone()

### Community 73 - "admin/historical-dedup.ts"
Cohesion: 0.15
Nodes (19): DedupCursor, DEFAULT_BATCH, MAX_BATCH, handle(), handleEnqueue(), handleSyncBatch(), KickResult, parseBody() (+11 more)

### Community 75 - "auth/account.ts"
Cohesion: 0.10
Nodes (13): zod, buildClearRefreshCookie(), REFRESH_TOKEN_COOKIE_NAME, AccountDeleteBodySchema, SetTzBodySchema, SettingsPutBodySchema, buildClearSessionCookie(), DELETE() (+5 more)

### Community 76 - "Digest Generation"
Cohesion: 0.08
Nodes (24): Digest Generation, REQ-PIPE-001: Global scrape-and-summarise pipeline on a fixed cadence, REQ-PIPE-002: Chunked LLM output content contract, REQ-PIPE-003: Same-story dedupe - core matching contract, REQ-PIPE-004: Curated source registry with ≥50 feeds spanning the 21 system tags, REQ-PIPE-005: Fourteen-day retention with starred-exempt cleanup, REQ-PIPE-006: scrape_runs aggregation surfaces stats, history, and in-flight progress, REQ-PIPE-007: Orphan-tag source cleanup (+16 more)

### Community 77 - "mergeAsAltSource"
Cohesion: 0.24
Nodes (8): AD32: Same-story dedup uses Workers AI embeddings + Vectorize, not LLM finalize call, AD39: Raise dedup auto-merge threshold to 0.88 and gate merges to a 72h news-cycle window, AD41: Bidirectional finalize merge + automatic post-tick dedup sweep, buildMergeStatements(), FinalizeRow, mergeAsAltSource(), pickWinner(), CapturedStatement

### Community 80 - "finalize-vectorize.test.ts"
Cohesion: 0.25
Nodes (6): DbCall, makeEnv(), makeMockSweepQueue(), MockDb, MockSweepQueue, MockVectorize

### Community 81 - "src/env.d.ts"
Cohesion: 0.32
Nodes (6): App, Cloudflare, Env, Locals, Runtime, WorkerBindings

### Community 82 - "Configuration"
Cohesion: 0.11
Nodes (18): AI Gateway setup, Compatibility, Configuration, Configuration Files, Contents, Cron, DEV_BYPASS_USER_ID override, Developer-route environment contract (+10 more)

### Community 83 - "scrape-finalize-consumer.ts"
Cohesion: 0.27
Nodes (11): readTimeWindowSeconds(), ArticleRow, AutoCandidate, autoSweepLookbackSeconds(), BorderCandidate, enqueueAutoSweep(), FinalizeJobMessage, flipGate() (+3 more)

### Community 84 - "discovery-status.test.ts"
Cohesion: 0.29
Nodes (3): env(), makeKvStub(), UserRow

### Community 85 - "rules"
Cohesion: 0.29
Nodes (6): ignorePatterns, rules, no-console, no-unused-vars, typescript/no-explicit-any, $schema

### Community 86 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, astro, @astrojs/cloudflare, fast-xml-parser, tailwindcss, @tailwindcss/vite, zod

### Community 87 - "manifest.test.ts"
Cohesion: 0.29
Nodes (3): manifest, ManifestIcon, WebManifest

### Community 88 - "generate.ts"
Cohesion: 0.33
Nodes (9): escapeControlCharsInJsonStrings(), extractFirstJsonObject(), LLMPayload, parseJsonWithRepairs(), parseLLMJson(), parseLLMPayload(), removeTrailingCommasOutsideStrings(), sanitizeText() (+1 more)

### Community 89 - "tests/env.d.ts"
Cohesion: 0.40
Nodes (4): Cloudflare, cloudflare:test, Env, ProvidedEnv

### Community 90 - "canonical-url.ts"
Cohesion: 0.47
Nodes (4): canonicalize(), isTrackingParam(), TRACKING_PARAM_EXACT, TRACKING_PARAM_PREFIXES

### Community 93 - "pipeline-run.ts"
Cohesion: 0.16
Nodes (15): sanitizeErrorDetail(), checkDevEndpointOrigin(), AdminAuthOk, GET(), KickResult, parseModeFromBody(), POST(), runKick() (+7 more)

### Community 101 - "Authentication"
Cohesion: 0.22
Nodes (10): Authentication, Conventions, DELETE /api/auth/account (Delete account, JSON path), GET /api/auth/{provider}/callback (OAuth callback), POST /api/auth/account (Delete account, form path), POST /api/auth/logout (End session), POST /api/auth/{provider}/login (Start OAuth flow), POST /api/auth/refresh (Force token rotation) (+2 more)

### Community 116 - "Endpoints"
Cohesion: 0.18
Nodes (11): Endpoints, GET /api/admin/dedup-diag, GET /api/admin/dedup-status, GET /api/admin/discovery/retry-bulk, GET /api/admin/embed-backfill, GET /api/admin/force-refresh, GET /api/admin/pipeline-status, POST /api/admin/discovery/retry-bulk (+3 more)

### Community 117 - "Deployment"
Cohesion: 0.20
Nodes (10): Cloudflare Resources, Contents, Dependency Automation, Deployment, Local Development, PR Checks - CI gates (`test.yml`), Prerequisites, Related Documentation (+2 more)

### Community 118 - "main"
Cohesion: 0.21
Nodes (11): AD15: Test pool exercises worker.ts directly; production runs through the Astro-merged entry, AD49: `workflow_run` deploy gate hardened against fork pwn-request vector, Environment-specific configuration, Production Deployment, Verification scope, Deploy your own, __dirname, main() (+3 more)

### Community 119 - "Content sources"
Cohesion: 0.13
Nodes (15): Content sources, Cron/queue race prevention, Discovery flow, Dynamic tag-specific source discovery, Error handling, First digest after adding a new tag, `generateDigest(user, trigger, digestId?)` - the one function, Generic sources - run for every hashtag (+7 more)

### Community 120 - "blocked-publishers.ts"
Cohesion: 0.42
Nodes (6): BLOCKED_HOSTS, BLOCKED_NAME_TOKENS, filterBlockedPublishers(), hostIsBlocked(), isBlockedPublisher(), textHasBlockedToken()

### Community 121 - "Non-Functional Requirements"
Cohesion: 0.18
Nodes (11): CON-A11Y-001: Accessibility minimum, CON-AUTH-001: Custom federated OAuth/OIDC + HMAC-SHA256 JWT, CON-COST-001: Target monthly cost ≈ $42 at 100 users, CON-DATA-001: Strong consistency in D1, edge cache in KV, CON-LLM-001: Centralized deterministic prompts, CON-PERF-001: 100-user thundering-herd target, CON-SEC-001: Strict content security policy, CON-SEC-002: Outbound article-body fetches flow through the SSRF-guarded helper (+3 more)

### Community 122 - "Reading Experience"
Cohesion: 0.14
Nodes (14): Reading Experience, REQ-READ-001: Overview grid of today's digest, REQ-READ-002: Article detail view rendering, REQ-READ-003: Read tracking, REQ-READ-005: Empty dashboard state, REQ-READ-006: Empty, error, and offline pages, REQ-READ-007: Tag railing reorder animation, REQ-READ-008: Tag railing scroll, wrap, and fallback (+6 more)

### Community 123 - "fetch"
Cohesion: 0.25
Nodes (8): AD38: CF Access-protected admin endpoints must be invoked via top-level navigation, not fetch(), GET /api/admin/pipeline-run, POST /api/admin/discovery/retry, Integration deployment, Boundaries, Constraints, Technology Stack, fetch()

### Community 124 - "Authentication"
Cohesion: 0.17
Nodes (12): Authentication, REQ-AUTH-001: Sign in with a federated identity provider, REQ-AUTH-002: Access token + refresh token, instant revocation, REQ-AUTH-003: CSRF defense for state-changing endpoints, REQ-AUTH-004: OAuth error surfacing, REQ-AUTH-005: Account deletion, REQ-AUTH-006: Admin surface gating, REQ-AUTH-007: Cross-provider account dedup (+4 more)

### Community 125 - "Observability"
Cohesion: 0.17
Nodes (12): Observability, REQ-OPS-001: Structured JSON logging, REQ-OPS-002: Sanitized error surfaces, REQ-OPS-003: Content-Security-Policy on every response, REQ-OPS-004: Crawler policy and public-surface discoverability, REQ-OPS-005: Admin force-refresh endpoint, REQ-OPS-006: Integration deployment target, REQ-OPS-007: Public sitemap for crawler discovery (+4 more)

### Community 126 - "pwa.md"
Cohesion: 0.18
Nodes (9): Design System, REQ-DES-001: Swiss-minimal visual language, REQ-DES-002: Light and dark mode with no flash, REQ-DES-003: Deliberate motion system, REQ-DES-004: Mobile and PWA no-flash chrome, PWA & Mobile, REQ-PWA-001: Installable PWA manifest, REQ-PWA-003: Mobile-first responsive layout (+1 more)

### Community 127 - "Onboarding & Settings"
Cohesion: 0.18
Nodes (11): Onboarding & Settings, REQ-SET-001: Unified first-run and edit flow, REQ-SET-002: Hashtag curation strip UX, REQ-SET-003: Scheduled digest time with timezone, REQ-SET-004: Model selection, REQ-SET-005: Email notification preference, REQ-SET-006: Settings-incomplete gate, REQ-SET-007: Timezone change detection (+3 more)

### Community 128 - "trigger-scrape.ts"
Cohesion: 0.18
Nodes (11): addChunkStats(), ChunkStats, finishRun(), nowSeconds(), ScrapeRunSeed, startRun(), DevEnv, POST() (+3 more)

### Community 129 - "Conventions"
Cohesion: 0.20
Nodes (10): Acquire a session and start a job, Admin / Operator API Reference, Bearer / Origin bypass, Canonical vocabulary, Contents, Conventions, Error envelope, Related Documentation (+2 more)

### Community 130 - "news-digest - requirements (historical)"
Cohesion: 0.20
Nodes (10): Cost and time transparency, Deployment, History pagination, How it works, news-digest - requirements (historical), Observability, Scaffolding order, Security headers (+2 more)

### Community 131 - "Source Discovery"
Cohesion: 0.20
Nodes (10): REQ-DISC-001: Per-tag feed discovery queueing and pickup, REQ-DISC-002: Discovery progress visibility, REQ-DISC-003: Self-healing feed health tracking, REQ-DISC-004: Manual re-discover UI surface, REQ-DISC-005: Discovery prompt injection protection, REQ-DISC-006: Stuck-tag retention, REQ-DISC-007: Per-tag feed discovery execution and persistence, REQ-DISC-008: Manual re-discover endpoint contract (+2 more)

### Community 132 - "pipeline-status.ts"
Cohesion: 0.29
Nodes (7): DedupRow, GET(), jsonResponse(), PipelineRunRow, ScrapeRow, StatusError, StatusSuccess

### Community 134 - "chunk-consumer.test.ts"
Cohesion: 0.25
Nodes (3): ChunkJobMessage, KvState, SqlRecord

### Community 135 - "News Digest - curated by an LLM"
Cohesion: 0.25
Nodes (8): Built with Codeflare's spec-driven development framework, License, Local dev, News Digest - curated by an LLM, Stack, What's in it, What's *not* in it, Why

### Community 136 - "news-digest - Product Specification"
Cohesion: 0.22
Nodes (9): Actors, Canonical Spec Layout, Design Principles, Documentation, news-digest - Product Specification, Out of Scope, Requirement Domains, Support Files (+1 more)

### Community 137 - "Operational TODOs"
Cohesion: 0.25
Nodes (7): 12 curated source URLs currently 4xx, Hardcoded sitemap origin in robots.txt / llms.txt, Operational TODOs, Partial REQs with deferred scope, Pending Work, REQ-SET-008 AC 4 - `POST /api/tags/restore` server behaviour, Test-name migration after auth domain split

### Community 138 - "Motion & polish"
Cohesion: 0.25
Nodes (8): Cascading content reveals, Cut from scope (previously specified, removed as decorative), First-run choreography, Foundations, Micro-interactions, Motion & polish, Page transitions, Skeleton loaders (LLM generation)

### Community 139 - "process-pending.test.ts"
Cohesion: 0.29
Nodes (3): mockFetchOk(), PutOptions, rssBody()

### Community 140 - "dispatch-failure.test.ts"
Cohesion: 0.25
Nodes (3): SqlCall, TzRow, UserRow

### Community 141 - "Admin-only routes (Cloudflare Access gating)"
Cohesion: 0.33
Nodes (6): Admin-only routes (Cloudflare Access gating), Browser invocation pattern for Access-gated endpoints, Dev-bypass runbook (integration only), Paths to gate, Setting `CF_ACCESS_AUD` and the `*.workers.dev` perimeter (production), Setup (one-time, operator console)

### Community 142 - "4. Source Module Map"
Cohesion: 0.29
Nodes (7): AD42: Bidirectional historical-dedup + sweep cursor aligned with time window + multi-rerank, 4.1 Middleware, 4.3 Pages and API Routes, 4.4 Layouts, Components, and Client Scripts, 4.5 Worker, Queue, and Migrations, 4. Source Module Map, self()

### Community 143 - "news-digest - Documentation"
Cohesion: 0.33
Nodes (6): Canonical Documentation Layout, Decision and Support Files, Glossary, Implementation Lanes, news-digest - Documentation, Related Documentation

### Community 144 - "HTTP API"
Cohesion: 0.33
Nodes (6): Auth, Client-side polling during generation, Digest and refresh, History and stats, HTTP API, Settings

### Community 145 - "Email notifications (Resend)"
Cohesion: 0.33
Nodes (6): Email notifications (Resend), Email template, Resend call, Secrets, Sender domain, When it fires

### Community 146 - "Spec Changes - Archive (April 2026)"
Cohesion: 0.33
Nodes (6): 2026-04-22, 2026-04-23, 2026-04-24, 2026-04-25, 2026-04-26, Spec Changes - Archive (April 2026)

### Community 147 - "SDD Review Queue"
Cohesion: 0.33
Nodes (5): Coverage gaps, operational-logging-evidence-1, pwa-apple-icon-contract-1, SDD Review Queue, source-anchor-gap-1

### Community 148 - "retry-bulk.ts"
Cohesion: 0.60
Nodes (5): executeRetryBulk(), GET(), isEmptyFeedsEntry(), POST(), userHashtags()

### Community 149 - "Architecture Decision Records"
Cohesion: 0.40
Nodes (5): Architecture Decision Records, Decision Index, Model-control updates, Platform migration, Related Documentation

### Community 150 - "Migrations"
Cohesion: 0.40
Nodes (4): Adding a new migration, Historical context (CF-020 reverted), Migration index, Migrations

### Community 151 - "LLM prompts"
Cohesion: 0.40
Nodes (5): Digest generation prompt, Inference parameters (shared), LLM prompts, Source discovery prompt, Why a single file

### Community 152 - "schema-0005.test.ts"
Cohesion: 0.40
Nodes (3): insertArticle(), now(), UserRow

### Community 153 - "PWA icons"
Cohesion: 0.50
Nodes (3): Current assets, PWA icons, Updating the icon

### Community 154 - "User stats widget"
Cohesion: 0.50
Nodes (4): My take on this requirement, Tracking "read", User stats widget, Widget implementation

### Community 155 - "Email Notifications"
Cohesion: 0.50
Nodes (4): Email Notifications, REQ-MAIL-001: Digest-ready email content, REQ-MAIL-002: Non-blocking email failure, REQ-MAIL-003: Digest-ready email send policy

### Community 156 - "History & Stats"
Cohesion: 0.50
Nodes (4): History & Stats, REQ-HIST-001: Day-grouped article history, REQ-HIST-002: User stats widget, REQ-HIST-003: Search, tag filter, and deep-link on /history

### Community 157 - "Scale and tradeoffs"
Cohesion: 0.67
Nodes (3): Known tradeoffs (accepted), Scale and tradeoffs, What's sized for 100-user scale

### Community 160 - "Digests"
Cohesion: 0.40
Nodes (5): Digests, GET /api/digest/:id (Tombstoned), GET /api/digest/today (Today's digest), GET /api/scrape-status (Poll active scrape progress), POST /api/digest/refresh (Tombstoned)

### Community 161 - "Settings"
Cohesion: 0.40
Nodes (5): GET /api/discovery/status (Poll pending tag discovery), GET /api/settings (Read user settings), POST /api/settings (Update settings, form path), PUT /api/settings (Update settings, JSON path), Settings

### Community 162 - "SEO and Crawler Policy"
Cohesion: 0.40
Nodes (5): GET /llms-full.txt (Agents policy, extended), GET /llms.txt (Agents policy, short), GET /robots.txt (Crawler policy), GET /sitemap.xml (XML sitemap), SEO and Crawler Policy

### Community 163 - "Security Policy"
Cohesion: 0.40
Nodes (5): Reporting a Vulnerability, Security Policy, Supported Versions, What's in scope, What's out of scope

### Community 164 - "oauth-errors.ts"
Cohesion: 0.60
Nodes (3): mapOAuthError(), OAUTH_ERROR_CODES, OAuthErrorCode

### Community 165 - "Disposition"
Cohesion: 0.40
Nodes (5): Disposition, Ack, Invalid, Pending, Retry

### Community 166 - "schema-0003.test.ts"
Cohesion: 0.60
Nodes (3): insertArticle(), insertUser(), now()

### Community 167 - "Pages"
Cohesion: 0.50
Nodes (4): GET /404 (Not-found page), GET /500 (Server-error page), GET / (Landing page), Pages

### Community 168 - "Tags"
Cohesion: 0.50
Nodes (4): POST /api/tags/delete-initial (Dismiss new-user seed prompt), POST /api/tags/restore (Restore default tags), PUT /api/tags (Add or remove one tag), Tags

### Community 170 - ".review-decisions.md"
Cohesion: 0.50
Nodes (3): CF-003 at `src/pages/api/admin/embed-backfill.ts:69`, `src/pages/api/admin/historical-dedup.ts:118`, `src/pages/api/admin/discovery/retry.ts:93`, `src/pages/api/admin/discovery/retry-bulk.ts:155` (Missing rate limiting / cost amplification), Cycle 1 - 2026-06-15, Review Decisions

## Knowledge Gaps
- **827 isolated node(s):** `validate-app-url.sh script`, `config`, `_merge_email_winners`, `_merge_user_merges`, `$schema` (+822 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1129 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `sources.ts`, `oauth-providers.ts`, `discovery.ts`, `cleanup.test.ts`, `trigger-scrape.ts`, `retry-endpoint.test.ts`, `Base.astro`, `settings.astro`, `chunk-consumer.test.ts`, `auth.ts`, `scrape-coordinator.ts`, `digest-today.ts`, `log.ts`, `signSession`, `process-pending.test.ts`, `dispatch-failure.test.ts`, `history.ts`, `scrape-chunk-consumer.ts`, `llm-json.ts`, `callback.ts`, `rediscovery-lifecycle.test.ts`, `[slug].astro`, `email-dispatch.ts`, `schema-0005.test.ts`, `admin/embed-backfill.ts`, `email.ts`, `dedup-diag.ts`, `chunk-summary-length.test.ts`, `package.json`, `tag-railing-flip.test.ts`, `jwt-secret.ts`, `prompts.ts`, `feed.test.ts`, `dedup-rerank.ts`, `card-interactions.ts`, `oauth-errors.ts`, `generateUlid`, `dedup-diag.test.ts`, `schema-0003.test.ts`, `bundled/theme-toggle.ts`, `loadStarredPayload`, `worker.ts`, `4.2 Libraries (`src/lib/`)`, `Headline`, `curated-sources.ts`, `security-headers.test.ts`, `crawler-policy.test.ts`, `check-wrangler-vars-parity.mjs`, `dedupe.ts`, `dedup-sweep-consumer.ts`, `embed-backfill.test.ts`, `alt-sources-modal.ts`, `retry-bulk-endpoint.test.ts`, `stats.test.ts`, `force-refresh.test.ts`, `DigestCard.astro`, `Architecture`, `types.ts`, `lib/historical-dedup.ts`, `set-tz.test.ts`, `install-prompt.ts`, `admin/historical-dedup.ts`, `logout.test.ts`, `auth/account.ts`, `mergeAsAltSource`, `coordinator.test.ts`, `finalize-vectorize.test.ts`, `discovery-status.test.ts`, `manifest.test.ts`, `generate.ts`, `canonical-url.ts`, `refresh-gone.test.ts`, `rate-limited.ts`, `pipeline-run.ts`, `blocked-publishers.ts`, `digest.astro`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `log()` connect `log` to `sources.ts`, `trigger-scrape.ts`, `discovery.ts`, `requireAdminSession`, `pipeline-status.ts`, `scrape-coordinator.ts`, `auth.ts`, `digest-today.ts`, `log.ts`, `scrape-chunk-consumer.ts`, `history.ts`, `callback.ts`, `rediscovery-lifecycle.test.ts`, `retry-bulk.ts`, `email-dispatch.ts`, `admin/embed-backfill.ts`, `email.ts`, `dedup-diag.ts`, `jwt-secret.ts`, `dedup-rerank.ts`, `generateUlid`, `curated-sources.ts`, `loadStarredPayload`, `worker.ts`, `retry.ts`, `cleanup.ts`, `dedupe.ts`, `dedup-sweep-consumer.ts`, `stats.test.ts`, `Architecture`, `types.ts`, `lib/historical-dedup.ts`, `admin/historical-dedup.ts`, `auth/account.ts`, `scrape-finalize-consumer.ts`, `pipeline-run.ts`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Why does `Observability` connect `Architecture` to `architecture.md`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `log()` (e.g. with `Event envelope` and `Related Documentation`) actually correct?**
  _`log()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `validate-app-url.sh script`, `config`, `_merge_email_winners` to the rest of the system?**
  _827 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sources.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062342342342342344 - nodes in this community are weakly interconnected._
- **Should `oauth-providers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._