# Graph Report - ai-news-digest  (2026-10-14)

## Corpus Check
- 349 files · ~464,286 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .toml 2, .example 1)

## Summary
- 2377 nodes · 5072 edges · 160 communities (129 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7814b77`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sources.ts
- oauth-providers.ts
- discovery.ts
- cleanup.test.ts
- log
- Base.astro
- 0001_initial.sql
- settings.astro
- scrape-coordinator.ts
- refresh-tokens.ts
- digest-page.ts
- history.ts
- errorResponse
- signSession
- scrape-chunk-consumer.ts
- force-refresh-state.test.ts
- astro
- llm-json.ts
- [slug].astro
- callback.ts
- rediscovery-lifecycle.test.ts
- pipeline-consumer.ts
- integration.test.ts
- compilerOptions
- digest.astro
- lib/historical-dedup.ts
- email.ts
- scrape-finalize-consumer.ts
- chunk-summary-length.test.ts
- package.json
- session-jwt.ts
- auth.ts
- feed.test.ts
- dedup-rerank.ts
- email-dispatch.ts
- Historical index labels and dates
- generateUlid
- dedup-diag.test.ts
- 4.2 Libraries (`src/lib/`)
- bundled/theme-toggle.ts
- worker.ts
- history.astro
- bidirectional-dedup.ts
- prefer-direct-source.ts
- page-effects.ts
- security-headers.test.ts
- ref_node_fs
- API Reference
- retry.ts
- devDependencies
- scripts
- crawler-policy.test.ts
- delete-initial.test.ts
- check-wrangler-vars-parity.mjs
- check-req-backlinks.mjs
- check-no-page-pattern-b.mjs
- dedupe.ts
- queue-handler.ts
- embed-backfill.test.ts
- alt-sources-modal.ts
- retry-bulk-endpoint.test.ts
- Spec Changes
- stats.test.ts
- force-refresh.test.ts
- DigestCard.astro
- Architecture
- sources-cache.ts
- historical-dedup-batch.test.ts
- check-deploy-config.mjs
- generate-pwa-icons.mjs
- set-tz.test.ts
- install-prompt.ts
- historical-dedup.test.ts
- SESSION_COOKIE_NAME
- auth/refresh.ts
- Digest Generation
- mergeAsAltSource
- coordinator.test.ts
- finalize-vectorize.test.ts
- src/env.d.ts
- Configuration
- star.test.ts
- discovery-status.test.ts
- rules
- dependencies
- manifest.test.ts
- pipeline-run.test.ts
- tests/env.d.ts
- canonical-url.ts
- refresh-gone.test.ts
- rate-limited.ts
- originOf
- 0007_scrape_chunk_completions.sql
- idx_articles_embedding_status
- 0013_dedup_runs.sql
- 0014_pipeline_runs.sql
- initFooterScramble
- vitest
- sdd/README.md
- [provider]/login.ts
- article-detail.ts
- validate-app-url.sh
- Endpoints
- Deployment
- main
- Content sources
- dedup-diag.ts
- Non-Functional Requirements
- Reading Experience
- Security
- Authentication
- Observability
- pwa.md
- Onboarding & Settings
- scrape-run.ts
- Conventions
- news-digest - requirements (historical)
- Source Discovery
- callback-google.test.ts
- retry-endpoint.test.ts
- google-jwks.ts
- News Digest - curated by an LLM
- news-digest - Product Specification
- Operational TODOs
- Motion & polish
- callback.test.ts
- dispatch-failure.test.ts
- feed-eviction.test.ts
- buildEmbeddingInput
- news-digest - Documentation
- HTTP API
- Email notifications (Resend)
- Spec Changes - Archive (April 2026)
- star.ts
- chunk-packer.test.ts
- Architecture Decision Records
- Migrations
- LLM prompts
- decodeAccessJwt
- PWA icons
- User stats widget
- Email Notifications
- History & Stats
- Scale and tradeoffs
- .doc-coverage.md
- Rate Limits

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
- `Deploy your own` --references--> `main()`  [INFERRED]
  README.md → scripts/validate-curated-sources.mjs
- `AD48: Dedup cost reduction: borderline-rerank watermark + batched rerank call + pipeline-wide gpt-oss-20b` --references--> `clearWatermark()`  [INFERRED]
  documentation/decisions/README.md → src/lib/dedup-watermark.ts
- `Worker Vars (non-secret)` --references--> `readCosineThreshold()`  [INFERRED]
  documentation/lanes/configuration.md → src/lib/embeddings.ts
- `5.4 Operator-triggered historical-dedup sweep` --references--> `runHistoricalDedupBatch()`  [INFERRED]
  documentation/lanes/architecture.md → src/lib/historical-dedup.ts

## Import Cycles
- None detected.

## Communities (160 total, 31 thin omitted)

### Community 0 - "sources.ts"
Cohesion: 0.05
Nodes (70): RFC-2822, AD22: SSRF defence relies on Workers network sandbox; static IP allowlist is best-effort only, AD59: Forced and portal-like candidate fetch with deterministic non-article drop, 5.1 Global-feed pipeline (every 4 hours), ArticleBodyResult, extractArticleText(), fetchArticleBodies(), fetchArticleBodiesWithQuality() (+62 more)

### Community 1 - "oauth-providers.ts"
Cohesion: 0.15
Nodes (15): configuredProviders(), decodeJwtClaims(), envKeyClientId(), envKeyClientSecret(), fetchGoogleProfile(), GitHubEmail, GitHubUser, GOOGLE_ISS_VALUES (+7 more)

### Community 2 - "discovery.ts"
Cohesion: 0.05
Nodes (42): asArray(), contentTypeMatches(), discoverTag(), hasJsonItem(), hasXmlItem(), itemHasTitleAndLink(), LLMDiscoveryPayload, narrowDiscoveryPayload() (+34 more)

### Community 3 - "cleanup.test.ts"
Cohesion: 0.09
Nodes (17): applyD1Migrations, env, insertArticle(), insertUser(), now(), insertArticle(), now(), UserRow (+9 more)

### Community 4 - "log"
Cohesion: 0.12
Nodes (34): clearWatermark(), log(), LogLevel, LogRecord, AccessJwtClaims, AdminAuthResult, audMatches(), requireAdminSession() (+26 more)

### Community 5 - "Base.astro"
Cohesion: 0.06
Nodes (23): AD20: Idempotency tokens for client scripts loaded BOTH as Pattern B IIFE AND via page-level import must live on `window`, Props, Props, normalizedEmail, Props, cookieTheme, Props, safeJsonLd() (+15 more)

### Community 6 - "0001_initial.sql"
Cohesion: 0.09
Nodes (33): articles, digests, idx_articles_digest_rank, idx_articles_digest_slug, idx_articles_read, idx_digests_status, idx_digests_user_date, idx_digests_user_generated (+25 more)

### Community 7 - "settings.astro"
Cohesion: 0.08
Nodes (32): Props, defaultStats, formatInt(), formatReadOfTotal(), StatsResponse, clearPipelineState(), curatedTagSet, emptyFeedTags (+24 more)

### Community 8 - "scrape-coordinator.ts"
Cohesion: 0.13
Nodes (27): loadExistingCanonicalToIdMap(), loadExistingCanonicalUrls(), updateChunkCount(), hasCuratedSource(), applyPreferDirectOverGoogleNews(), assembleAllSources(), buildCandidates(), capChunks() (+19 more)

### Community 9 - "refresh-tokens.ts"
Cohesion: 0.13
Nodes (22): hexEncode(), buildRefreshCookie(), deviceFingerprint(), findRefreshToken(), generateRefreshTokenValue(), generateRowId(), issueRefreshToken(), REFRESH_TOKEN_COOKIE_NAME (+14 more)

### Community 10 - "digest-page.ts"
Cohesion: 0.12
Nodes (28): animateStripScrollTo(), armScrollDownReveal(), FlipChipOptions, flipChipToFront(), flipChipToPosition(), isFlipLocked(), formatCountdown(), init() (+20 more)

### Community 11 - "history.ts"
Cohesion: 0.09
Nodes (28): ArticleRow, computeNextScrapeAt(), loadTodayPayload(), ScrapeRunRow, TodayResponse, WireArticle, HASHTAG_REGEX, MAX_HASHTAGS (+20 more)

### Community 12 - "errorResponse"
Cohesion: 0.21
Nodes (27): errorResponse(), parseHashtags(), enforceRateLimit(), RATE_LIMIT_RULES, rateLimitResponse(), RateLimitResult, RateLimitRule, isValidTz() (+19 more)

### Community 13 - "signSession"
Cohesion: 0.06
Nodes (14): signSession(), ArticleRow, authedToken(), ScrapeRunRow, UserRow, authedRequest(), authedRequestWithRunId(), RunRow (+6 more)

### Community 14 - "scrape-chunk-consumer.ts"
Cohesion: 0.08
Nodes (37): countChunkCompletions(), recordChunkCompletion(), applyForeignKeysPragma(), normaliseRawDedupGroups(), normalizeHashtag(), splitIntoParagraphs(), addChunkStats(), finishRun() (+29 more)

### Community 15 - "force-refresh-state.test.ts"
Cohesion: 0.12
Nodes (16): AD24: Single OAUTH_JWT_SECRET for both session signing and CSRF state, base64UrlDecode(), base64UrlEncode(), enc, readCookie(), RFC-6265, verifyHmacSignature(), Message (+8 more)

### Community 16 - "astro"
Cohesion: 0.18
Nodes (9): astro, DEFAULT_STATUS, USER_FACING_MESSAGES, USER_FACING_MESSAGES_FOR_TESTS, GET(), ScrapeRunRow, CountRow, SumRow (+1 more)

### Community 17 - "llm-json.ts"
Cohesion: 0.11
Nodes (28): AD34: LLM same-event rerank for borderline cosine pairs, AD57: AI Gateway dynamic route for pipeline model control, AIRunResponse, escapeControlCharsInJsonStrings(), extractFirstJsonObject(), extractResponsePayload(), extractTokensIn(), extractTokensOut() (+20 more)

### Community 18 - "[slug].astro"
Cohesion: 0.09
Nodes (20): MONTHS, primaryFormatted, primaryIso, Props, safeHref(), localeForTz(), AltSourceRow, altSources (+12 more)

### Community 19 - "callback.ts"
Cohesion: 0.15
Nodes (23): ExistingUserRow, mapOAuthError(), OAUTH_ERROR_CODES, OAuthErrorCode, ProviderConfig, userIdFor(), CallbackEnv, errorRedirect() (+15 more)

### Community 20 - "rediscovery-lifecycle.test.ts"
Cohesion: 0.17
Nodes (8): clearHealth(), CONSECUTIVE_FETCH_FAILURE_LIMIT, FeedHealthResult, healthKey(), recordFetchResult(), E2E_USER_ID, SYSTEM_USER_ID, KvStub

### Community 21 - "pipeline-consumer.ts"
Cohesion: 0.16
Nodes (19): ArticleRow, BATCH_SIZE, BatchResult, countRemaining(), runOneBackfillBatch(), embedTexts(), advancePhase(), markFailed() (+11 more)

### Community 22 - "integration.test.ts"
Cohesion: 0.21
Nodes (7): DEFAULT_TZ, localDateInTz(), localHourMinuteInTz(), localMidnightUnixInTz(), CapturedCall, DispatchUserRow, PreparedCall

### Community 23 - "compilerOptions"
Cohesion: 0.09
Nodes (21): astro/tsconfigs/strict, compilerOptions, allowJs, baseUrl, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, jsx (+13 more)

### Community 24 - "digest.astro"
Cohesion: 0.12
Nodes (13): redirect(), requireSettingsComplete(), gated, rawSelectedTags, selectedTagSet, sortedUserTags, tagCounts, todayLocalDate (+5 more)

### Community 25 - "lib/historical-dedup.ts"
Cohesion: 0.12
Nodes (16): AD36: Lower dedup auto-merge threshold to 0.78 and remove the per-batch rerank cap, AD41: Bidirectional finalize merge + automatic post-tick dedup sweep, readWatermark(), writeWatermark(), ArticleRow, DedupBatchResult, DedupCursor, DEFAULT_BATCH (+8 more)

### Community 26 - "email.ts"
Cohesion: 0.14
Nodes (15): EmailHeadline, TagTally, DigestReadyEmailParams, escapeHtml(), headlineRow(), HeadlineRowInput, pad2(), renderDigestReadyEmail() (+7 more)

### Community 27 - "scrape-finalize-consumer.ts"
Cohesion: 0.16
Nodes (23): AD45: Accepted orchestration-file sizes (coordinator, chunk-consumer, settings.astro), BgeRunResult, cosineSimilarity(), DEFAULT_COSINE_THRESHOLD, DEFAULT_HIGH_CONFIDENCE_COSINE, DEFAULT_SAME_VENDOR_PENALTY, DEFAULT_TIME_WINDOW_SECONDS, deleteVectorsBatched() (+15 more)

### Community 28 - "chunk-summary-length.test.ts"
Cohesion: 0.11
Nodes (18): article(), ArticleRow, deliver(), Details, Disposition, Ack, Invalid, Pending (+10 more)

### Community 29 - "package.json"
Cohesion: 0.11
Nodes (17): config, name, private, type, version, @astrojs/check, @astrojs/cloudflare, @cloudflare/workers-types (+9 more)

### Community 31 - "session-jwt.ts"
Cohesion: 0.27
Nodes (9): MIN_JWT_SECRET_BYTES, requireStrongJwtSecret(), getHmacKey(), HEADER_B64, isSessionClaims(), JWT_CLOCK_SKEW_SECONDS, SessionClaims, verifySession() (+1 more)

### Community 32 - "auth.ts"
Cohesion: 0.13
Nodes (23): findUnrevokedChild(), revokeAllForUser(), AuthenticatedUser, AuthEnv, CLEAR_BOTH_COOKIES, handleRevokedReplayPath(), loadSession(), loadSessionForPage() (+15 more)

### Community 33 - "feed.test.ts"
Cohesion: 0.15
Nodes (7): authedRequest(), MockOpts, RawArticle, ScrapeRunRow, UserRow, WireArticle, WireResponse

### Community 34 - "dedup-rerank.ts"
Cohesion: 0.15
Nodes (14): BatchPayload, BatchVerdictEntry, buildBatchUser(), DEFAULT_RERANK_FLOOR, narrowBatchPayload(), readRerankFloor(), RERANK_BATCH_SIZE, RERANK_SYSTEM (+6 more)

### Community 35 - "email-dispatch.ts"
Cohesion: 0.17
Nodes (14): mapConcurrent(), HeadlineRow, selectUnreadHeadlinesForUser(), tagTallySinceMidnight(), TallyRow, TotalRow, dispatchDailyEmails(), dispatchForTz() (+6 more)

### Community 36 - "Historical index labels and dates"
Cohesion: 0.04
Nodes (46): AD10: Atomic conditional UPDATE as the once-per-run idempotency gate, AD11: Keep `style-src 'unsafe-inline'`; runtime `.style.X` writes are intentional, AD12: Integration env: separate Cloudflare resources, manual trigger from develop, crons disabled, AD13: No non-essential cookies (analytics gate), AD14: History-page perf-comparability test permanently skipped, AD17: Reject `dedupe-groups.ts` extraction, AD18: Reject `deferred-candidates.ts`; chunk-overflow path stays log-only, AD19: Reject `tag-railing-flip-core.ts`; FLIP measurements are not separable from DOM (+38 more)

### Community 37 - "generateUlid"
Cohesion: 0.15
Nodes (15): findRecentRunningRun(), kickCoordinator(), RecentRun, tryClaimDispatch(), DEFAULT_MODEL_ID, estimateCost(), modelById(), ModelOption (+7 more)

### Community 38 - "dedup-diag.test.ts"
Cohesion: 0.24
Nodes (10): ADMIN_USER_ROW, adminCookieJwt(), ArticleRow, callGet(), CallOpts, DbFixture, makeDb(), makeVectorize() (+2 more)

### Community 39 - "4.2 Libraries (`src/lib/`)"
Cohesion: 0.17
Nodes (12): 4.2 Libraries (`src/lib/`), BRAND_ONLY_TAGS, CURATED_SOURCES, CURATED_TAGS, CuratedSource, CuratedSourceKind, GOOGLE_NEWS_CURATED_TAGS, googleNewsSourceForTag() (+4 more)

### Community 40 - "bundled/theme-toggle.ts"
Cohesion: 0.20
Nodes (13): applyHtmlBgInlineStyle(), applyMetaThemeColor(), applyTheme(), BG_BY_THEME, DATA_ATTR, nextTheme(), persistTheme(), persistThemeCookie() (+5 more)

### Community 41 - "worker.ts"
Cohesion: 0.11
Nodes (15): handleBatch(), handleDedupSweepBatch(), handlePipelineJobsBatch(), PipelineJobMessage, CoordinatorMessage, handleCoordinatorBatch(), handleFinalizeBatch(), CRON_HANDLERS (+7 more)

### Community 42 - "history.astro"
Cohesion: 0.12
Nodes (14): Props, slugify(), stripHyphens(), data, DayGroup, filteredArticles, HistoryResponse, initialSelectedTagSet (+6 more)

### Community 43 - "bidirectional-dedup.ts"
Cohesion: 0.29
Nodes (7): AD43: Shared per-match dedup classifier; outer control flow stays per-consumer, ClassifierParams, classifyMatchPair(), ClassifyOutcome, MatchInput, SelfArticle, PARAMS

### Community 44 - "prefer-direct-source.ts"
Cohesion: 0.29
Nodes (8): isGoogleNewsUrl(), preferDirectOverGoogleNews(), sharedTitleTokenCount(), TITLE_STOPWORDS, titlesShareAnyToken(), tokenizeTitle(), findExistingGoogleNewsTitleMatch(), googleNewsExistingTitleScore()

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
Cohesion: 0.05
Nodes (46): API Reference, Authentication, Contents, Conventions, DELETE /api/articles/:id/star (Unstar article), DELETE /api/auth/account (Delete account, JSON path), Developer Tools, Digests (+38 more)

### Community 49 - "retry.ts"
Cohesion: 0.19
Nodes (8): zod, DiscoveryRetryBodySchema, SetTzBodySchema, SettingsPutBodySchema, TagsPostBodySchema, isFormEncoded(), POST(), userHashtagSet()

### Community 50 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @astrojs/check, @cloudflare/vitest-plugin, @cloudflare/workers-types, esbuild, knip, oxlint, @resvg/resvg-js (+5 more)

### Community 51 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, deploy, dev, fixtures, icons, knip, lint (+5 more)

### Community 53 - "delete-initial.test.ts"
Cohesion: 0.19
Nodes (5): DEFAULT_HASHTAGS, DELETE_ALL_TAGS_LABEL, RESTORE_DEFAULTS_LABEL, signedCookie(), UserRow

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
Cohesion: 0.30
Nodes (10): Candidate, Cluster, clusterByCanonical(), isDefined(), mergeClusters(), mergeClustersByLlmHints(), pickEarliest(), Survivor (+2 more)

### Community 58 - "queue-handler.ts"
Cohesion: 0.18
Nodes (7): BatchHandlerOptions, NonRetryableError, QueueMessageContext, readMaxQueueAttempts(), FakeBody, fakeEnv, { mockLog }

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
Cohesion: 0.04
Nodes (45): 2026-04-27, 2026-04-28, 2026-04-29, 2026-05-03, 2026-05-04, 2026-05-05, 2026-05-06, 2026-05-07 (+37 more)

### Community 63 - "stats.test.ts"
Cohesion: 0.18
Nodes (6): authedRequest(), Binding, formatInt(), formatReadOfTotal(), Responses, UserRow

### Community 64 - "force-refresh.test.ts"
Cohesion: 0.18
Nodes (7): ADMIN_USER_ROW, adminCookieJwt(), AdminSessionFixture, DbFixture, PreparedStmt, QueueFixture, refreshRequest()

### Community 65 - "DigestCard.astro"
Cohesion: 0.22
Nodes (7): altLabel, displaySourceName, Props, stagger, tagAttr, AltSourceLabel, formatAltSourceLabel()

### Community 66 - "Architecture"
Cohesion: 0.06
Nodes (34): 1. Overview, 2. Components, 3. Repository Layout, 4.1 Middleware, 4.3 Pages and API Routes, 4.4 Layouts, Components, and Client Scripts, 4. Source Module Map, 5.2 Operator force-refresh (+26 more)

### Community 67 - "sources-cache.ts"
Cohesion: 0.29
Nodes (8): AD16: Single-writer invariant for KV `sources:{tag}` enforced via centralised helper, key(), serialize(), sourcesCacheRawEqual(), writeSourcesCache(), DiscoveredFeed, SourcesCacheValue, applyEvictions()

### Community 68 - "historical-dedup-batch.test.ts"
Cohesion: 0.24
Nodes (9): ArticleRow, callBatch(), CallOpts, DbFixture, ExistenceGuardEntry, KvStore, makeDb(), makeKv() (+1 more)

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

### Community 73 - "historical-dedup.test.ts"
Cohesion: 0.29
Nodes (9): POST(), ADMIN_USER_ROW, adminCookieJwt(), CallOpts, callRoute(), DbCalls, makeDb(), makeQueue() (+1 more)

### Community 74 - "SESSION_COOKIE_NAME"
Cohesion: 0.12
Nodes (4): SESSION_COOKIE_NAME, UserRow, env(), makeKv()

### Community 75 - "auth/refresh.ts"
Cohesion: 0.24
Nodes (12): clientIp(), buildClearRefreshCookie(), AccountDeleteBodySchema, buildClearSessionCookie(), DELETE(), deleteAccountCore(), deleteUserKvEntries(), POST() (+4 more)

### Community 76 - "Digest Generation"
Cohesion: 0.08
Nodes (24): Digest Generation, REQ-PIPE-001: Global scrape-and-summarise pipeline on a fixed cadence, REQ-PIPE-002: Chunked LLM output content contract, REQ-PIPE-003: Same-story dedupe - core matching contract, REQ-PIPE-004: Curated source registry with ≥50 feeds spanning the 21 system tags, REQ-PIPE-005: Fourteen-day retention with starred-exempt cleanup, REQ-PIPE-006: scrape_runs aggregation surfaces stats, history, and in-flight progress, REQ-PIPE-007: Orphan-tag source cleanup (+16 more)

### Community 77 - "mergeAsAltSource"
Cohesion: 0.24
Nodes (8): AD32: Same-story dedup uses Workers AI embeddings + Vectorize, not LLM finalize call, AD39: Raise dedup auto-merge threshold to 0.88 and gate merges to a 72h news-cycle window, POST /api/admin/historical-dedup, buildMergeStatements(), FinalizeRow, mergeAsAltSource(), pickWinner(), CapturedStatement

### Community 80 - "finalize-vectorize.test.ts"
Cohesion: 0.25
Nodes (6): DbCall, makeEnv(), makeMockSweepQueue(), MockDb, MockSweepQueue, MockVectorize

### Community 81 - "src/env.d.ts"
Cohesion: 0.32
Nodes (6): App, Cloudflare, Env, Locals, Runtime, WorkerBindings

### Community 82 - "Configuration"
Cohesion: 0.10
Nodes (20): AI Gateway setup, Compatibility, Configuration, Configuration Files, Contents, Cron, DEV_BYPASS_USER_ID override, Developer-route environment contract (+12 more)

### Community 83 - "star.test.ts"
Cohesion: 0.25
Nodes (3): KNOWN_ARTICLE_IDS, sessionCookieFor(), UserRow

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

### Community 88 - "pipeline-run.test.ts"
Cohesion: 0.43
Nodes (6): ADMIN_USER_ROW, adminCookieJwt(), callRoute(), DbCalls, makeDb(), makeQueue()

### Community 89 - "tests/env.d.ts"
Cohesion: 0.40
Nodes (4): Cloudflare, cloudflare:test, Env, ProvidedEnv

### Community 90 - "canonical-url.ts"
Cohesion: 0.47
Nodes (4): canonicalize(), isTrackingParam(), TRACKING_PARAM_EXACT, TRACKING_PARAM_PREFIXES

### Community 93 - "originOf"
Cohesion: 0.17
Nodes (12): sanitizeErrorDetail(), checkDevEndpointOrigin(), OriginCheckResult, originOf(), UNSAFE_METHODS, AdminAuthOk, GET(), KickResult (+4 more)

### Community 100 - "sdd/README.md"
Cohesion: 0.15
Nodes (8): CF-003 at `src/pages/api/admin/embed-backfill.ts:69`, `src/pages/api/admin/historical-dedup.ts:118`, `src/pages/api/admin/discovery/retry.ts:93`, `src/pages/api/admin/discovery/retry-bulk.ts:155` (Missing rate limiting / cost amplification), Cycle 1 - 2026-06-15, Review Decisions, Glossary, Coverage gaps, pwa-apple-icon-contract-1, SDD Review Queue, source-anchor-gap-1

### Community 101 - "[provider]/login.ts"
Cohesion: 0.23
Nodes (11): providerByName(), PROVIDERS, buildAuthorizeUrl(), buildClearOAuthStateCookie(), buildOAuthStateCookie(), generateOAuthState(), GET, oauthStateCookieName() (+3 more)

### Community 116 - "Endpoints"
Cohesion: 0.13
Nodes (16): AD15: Test pool exercises worker.ts directly; production runs through the Astro-merged entry, AD38: CF Access-protected admin endpoints must be invoked via top-level navigation, not fetch(), Endpoints, GET /api/admin/dedup-diag, GET /api/admin/dedup-status, GET /api/admin/discovery/retry-bulk, GET /api/admin/embed-backfill, GET /api/admin/force-refresh (+8 more)

### Community 117 - "Deployment"
Cohesion: 0.12
Nodes (16): Admin-only routes (Cloudflare Access gating), Browser invocation pattern for Access-gated endpoints, Cloudflare Resources, Contents, Dependency Automation, Deployment, Dev-bypass runbook (integration only), Local Development (+8 more)

### Community 118 - "main"
Cohesion: 0.16
Nodes (14): AD49: `workflow_run` deploy gate hardened against fork pwn-request vector, Environment-specific configuration, Production Deployment, Verification scope, __dirname, main(), parseEntries(), probe() (+6 more)

### Community 119 - "Content sources"
Cohesion: 0.13
Nodes (15): Content sources, Cron/queue race prevention, Discovery flow, Dynamic tag-specific source discovery, Error handling, First digest after adding a new tag, `generateDigest(user, trigger, digestId?)` - the one function, Generic sources - run for every hashtag (+7 more)

### Community 120 - "dedup-diag.ts"
Cohesion: 0.21
Nodes (12): AGGREGATOR_HOSTS, etldPlusOne(), sameVendor(), TWO_LEVEL_TLDS, ArticleRow, ArticleSide, buildSide(), DiagError (+4 more)

### Community 121 - "Non-Functional Requirements"
Cohesion: 0.14
Nodes (14): Boundaries, CON-A11Y-001: Accessibility minimum, CON-AUTH-001: Custom federated OAuth/OIDC + HMAC-SHA256 JWT, CON-COST-001: Target monthly cost ≈ $42 at 100 users, CON-DATA-001: Strong consistency in D1, edge cache in KV, CON-LLM-001: Centralized deterministic prompts, CON-PERF-001: 100-user thundering-herd target, CON-SEC-001: Strict content security policy (+6 more)

### Community 122 - "Reading Experience"
Cohesion: 0.14
Nodes (14): Reading Experience, REQ-READ-001: Overview grid of today's digest, REQ-READ-002: Article detail view rendering, REQ-READ-003: Read tracking, REQ-READ-005: Empty dashboard state, REQ-READ-006: Empty, error, and offline pages, REQ-READ-007: Tag railing reorder animation, REQ-READ-008: Tag railing scroll, wrap, and fallback (+6 more)

### Community 123 - "Security"
Cohesion: 0.15
Nodes (13): Admin endpoint cross-site guards, Admin gate and JWT exp validation, Auth cookie policy, Content-Security-Policy, Contents, Dev-bypass prod guard, Google id_token RS256 verification, HSTS (+5 more)

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

### Community 128 - "scrape-run.ts"
Cohesion: 0.24
Nodes (6): ChunkStats, nowSeconds(), ScrapeRunSeed, startRun(), handleScrapeTick(), Call

### Community 129 - "Conventions"
Cohesion: 0.20
Nodes (10): Acquire a session and start a job, Admin / Operator API Reference, Bearer / Origin bypass, Canonical vocabulary, Contents, Conventions, Error envelope, Related Documentation (+2 more)

### Community 130 - "news-digest - requirements (historical)"
Cohesion: 0.20
Nodes (10): Cost and time transparency, Deployment, History pagination, How it works, news-digest - requirements (historical), Observability, Scaffolding order, Security headers (+2 more)

### Community 131 - "Source Discovery"
Cohesion: 0.20
Nodes (10): REQ-DISC-001: Per-tag feed discovery queueing and pickup, REQ-DISC-002: Discovery progress visibility, REQ-DISC-003: Self-healing feed health tracking, REQ-DISC-004: Manual re-discover UI surface, REQ-DISC-005: Discovery prompt injection protection, REQ-DISC-006: Stuck-tag retention, REQ-DISC-007: Per-tag feed discovery execution and persistence, REQ-DISC-008: Manual re-discover endpoint contract (+2 more)

### Community 132 - "callback-google.test.ts"
Cohesion: 0.24
Nodes (4): GOOGLE_STATE_COOKIE, googleClaims(), makeIdToken(), mockGoogleFetch()

### Community 134 - "google-jwks.ts"
Cohesion: 0.33
Nodes (8): RFC-7517, b64urlToBytes(), JsonWebKey, Jwks, loadJwks(), parseJwtHeader(), verifyGoogleIdToken(), verifySignatureAgainstJwk()

### Community 135 - "News Digest - curated by an LLM"
Cohesion: 0.22
Nodes (9): Built with Codeflare's spec-driven development framework, Deploy your own, License, Local dev, News Digest - curated by an LLM, Stack, What's in it, What's *not* in it (+1 more)

### Community 136 - "news-digest - Product Specification"
Cohesion: 0.22
Nodes (9): Actors, Canonical Spec Layout, Design Principles, Documentation, news-digest - Product Specification, Out of Scope, Requirement Domains, Support Files (+1 more)

### Community 137 - "Operational TODOs"
Cohesion: 0.25
Nodes (7): 12 curated source URLs currently 4xx, Hardcoded sitemap origin in robots.txt / llms.txt, Operational TODOs, Partial REQs with deferred scope, Pending Work, REQ-SET-008 AC 4 - `POST /api/tags/restore` server behaviour, Test-name migration after auth domain split

### Community 138 - "Motion & polish"
Cohesion: 0.25
Nodes (8): Cascading content reveals, Cut from scope (previously specified, removed as decorative), First-run choreography, Foundations, Micro-interactions, Motion & polish, Page transitions, Skeleton loaders (LLM generation)

### Community 140 - "dispatch-failure.test.ts"
Cohesion: 0.25
Nodes (3): SqlCall, TzRow, UserRow

### Community 142 - "buildEmbeddingInput"
Cohesion: 0.33
Nodes (6): AD33: Embed source-text and apply a same-vendor cosine penalty, AD42: Bidirectional historical-dedup + sweep cursor aligned with time window + multi-rerank, POST /api/admin/embed-backfill, 4.5 Worker, Queue, and Migrations, buildEmbeddingInput(), self()

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

### Community 147 - "star.ts"
Cohesion: 0.67
Nodes (5): authorize(), DELETE(), POST(), readArticleId(), successResponse()

### Community 148 - "chunk-packer.test.ts"
Cohesion: 0.40
Nodes (4): SNIPPET_FLOOR, ChunkCandidate, estimateCandidateChars(), packCandidatesIntoChunks()

### Community 149 - "Architecture Decision Records"
Cohesion: 0.40
Nodes (5): Architecture Decision Records, Decision Index, Model-control updates, Platform migration, Related Documentation

### Community 150 - "Migrations"
Cohesion: 0.40
Nodes (4): Adding a new migration, Historical context (CF-020 reverted), Migration index, Migrations

### Community 151 - "LLM prompts"
Cohesion: 0.40
Nodes (5): Digest generation prompt, Inference parameters (shared), LLM prompts, Source discovery prompt, Why a single file

### Community 152 - "decodeAccessJwt"
Cohesion: 0.50
Nodes (4): AD25: Cloudflare Access JWT signature unverified server-side; trust Access edge, AD44: Cloudflare Access JWT `exp` validation; signature still trusted from the perimeter, decodeAccessJwt(), isAccessJwtClaims()

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

## Knowledge Gaps
- **826 isolated node(s):** `validate-app-url.sh script`, `config`, `_merge_email_winners`, `_merge_user_merges`, `$schema` (+821 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `sources.ts`, `oauth-providers.ts`, `discovery.ts`, `cleanup.test.ts`, `log`, `Base.astro`, `scrape-coordinator.ts`, `refresh-tokens.ts`, `history.ts`, `errorResponse`, `signSession`, `scrape-chunk-consumer.ts`, `force-refresh-state.test.ts`, `astro`, `llm-json.ts`, `[slug].astro`, `callback.ts`, `rediscovery-lifecycle.test.ts`, `pipeline-consumer.ts`, `integration.test.ts`, `digest.astro`, `lib/historical-dedup.ts`, `email.ts`, `scrape-finalize-consumer.ts`, `chunk-summary-length.test.ts`, `package.json`, `tag-railing-flip.test.ts`, `session-jwt.ts`, `auth.ts`, `feed.test.ts`, `dedup-rerank.ts`, `email-dispatch.ts`, `generateUlid`, `dedup-diag.test.ts`, `4.2 Libraries (`src/lib/`)`, `bundled/theme-toggle.ts`, `worker.ts`, `history.astro`, `bidirectional-dedup.ts`, `prefer-direct-source.ts`, `security-headers.test.ts`, `crawler-policy.test.ts`, `delete-initial.test.ts`, `check-wrangler-vars-parity.mjs`, `dedupe.ts`, `queue-handler.ts`, `embed-backfill.test.ts`, `alt-sources-modal.ts`, `retry-bulk-endpoint.test.ts`, `stats.test.ts`, `force-refresh.test.ts`, `DigestCard.astro`, `sources-cache.ts`, `historical-dedup-batch.test.ts`, `set-tz.test.ts`, `install-prompt.ts`, `historical-dedup.test.ts`, `SESSION_COOKIE_NAME`, `mergeAsAltSource`, `coordinator.test.ts`, `finalize-vectorize.test.ts`, `star.test.ts`, `discovery-status.test.ts`, `manifest.test.ts`, `pipeline-run.test.ts`, `canonical-url.ts`, `refresh-gone.test.ts`, `rate-limited.ts`, `originOf`, `[provider]/login.ts`, `dedup-diag.ts`, `scrape-run.ts`, `callback-google.test.ts`, `retry-endpoint.test.ts`, `callback.test.ts`, `dispatch-failure.test.ts`, `feed-eviction.test.ts`, `chunk-packer.test.ts`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `log()` connect `log` to `sources.ts`, `scrape-run.ts`, `discovery.ts`, `scrape-coordinator.ts`, `refresh-tokens.ts`, `history.ts`, `errorResponse`, `scrape-chunk-consumer.ts`, `astro`, `star.ts`, `rediscovery-lifecycle.test.ts`, `pipeline-consumer.ts`, `callback.ts`, `lib/historical-dedup.ts`, `email.ts`, `scrape-finalize-consumer.ts`, `session-jwt.ts`, `auth.ts`, `dedup-rerank.ts`, `email-dispatch.ts`, `generateUlid`, `worker.ts`, `retry.ts`, `queue-handler.ts`, `Architecture`, `sources-cache.ts`, `auth/refresh.ts`, `originOf`, `dedup-diag.ts`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **Why does `Observability` connect `Architecture` to `architecture.md`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `log()` (e.g. with `Event envelope` and `Related Documentation`) actually correct?**
  _`log()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `validate-app-url.sh script`, `config`, `_merge_email_winners` to the rest of the system?**
  _826 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sources.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05209397344228805 - nodes in this community are weakly interconnected._
- **Should `oauth-providers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._