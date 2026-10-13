# Graph Report - ai-news-digest  (2026-10-13)

## Corpus Check
- 365 files · ~457,455 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .toml 2, .example 1)

## Summary
- 1832 nodes · 4296 edges · 116 communities (86 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 103
- Community 104

## God Nodes (most connected - your core abstractions)
1. `log()` - 156 edges
2. `vitest` - 130 edges
3. `signSession()` - 49 edges
4. `errorResponse()` - 48 edges
5. `originOf()` - 41 edges
6. `enforceRateLimit()` - 36 edges
7. `astro` - 35 edges
8. `checkOrigin()` - 32 edges
9. `requireAdminSession()` - 28 edges
10. `requireSession()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `authedRequest()` --calls--> `signSession()`  [EXTRACTED]
  tests/articles/feed.test.ts → src/lib/session-jwt.ts
- `sessionCookieFor()` --calls--> `signSession()`  [EXTRACTED]
  tests/articles/star.test.ts → src/lib/session-jwt.ts
- `validSessionCookie()` --calls--> `signSession()`  [EXTRACTED]
  tests/discovery/retry-bulk-endpoint.test.ts → src/lib/session-jwt.ts
- `authedToken()` --calls--> `signSession()`  [EXTRACTED]
  tests/history/api.test.ts → src/lib/session-jwt.ts
- `authedRequest()` --calls--> `signSession()`  [EXTRACTED]
  tests/history/stats.test.ts → src/lib/session-jwt.ts

## Import Cycles
- None detected.

## Communities (116 total, 30 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (58): RFC-2822, ArticleBodyResult, extractArticleText(), fetchArticleBodies(), fetchArticleBodiesWithQuality(), fetchArticleBody(), fetchArticleBodyWithQuality(), isHighConfidenceLandingOrPortalUrl() (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (39): RFC-7517, b64urlToBytes(), JsonWebKey, Jwks, loadJwks(), parseJwtHeader(), verifyGoogleIdToken(), verifySignatureAgainstJwk() (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (28): asArray(), contentTypeMatches(), discoverTag(), hasJsonItem(), hasXmlItem(), itemHasTitleAndLink(), LLMDiscoveryPayload, narrowDiscoveryPayload() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (30): errMsg(), purgeOldRefreshTokens(), loadOwnedTags(), runArticleRetention(), runChunkCompletionsPurge(), runCleanup(), runOrphanScrapeRunSweep(), runOrphanTagSweep() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (38): astro, clearWatermark(), MAX_BATCH, log(), AccessJwtClaims, AdminAuthResult, audMatches(), decodeAccessJwt() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (22): Props, Props, normalizedEmail, Props, cookieTheme, Props, safeJsonLd(), hours (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (33): articles, digests, idx_articles_digest_rank, idx_articles_digest_slug, idx_articles_read, idx_digests_status, idx_digests_user_date, idx_digests_user_generated (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (32): Props, defaultStats, formatInt(), formatReadOfTotal(), StatsResponse, clearPipelineState(), curatedTagSet, emptyFeedTags (+24 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (31): loadExistingCanonicalToIdMap(), loadExistingCanonicalUrls(), updateChunkCount(), normalizeHashtag(), SourceAdapter, SNIPPET_FLOOR, applyPreferDirectOverGoogleNews(), buildCandidates() (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (24): hexEncode(), clientIp(), buildClearRefreshCookie(), deviceFingerprint(), findRefreshToken(), findUnrevokedChild(), generateRefreshTokenValue(), generateRowId() (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (28): animateStripScrollTo(), armScrollDownReveal(), FlipChipOptions, flipChipToFront(), flipChipToPosition(), isFlipLocked(), formatCountdown(), init() (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (24): ArticleRow, computeNextScrapeAt(), loadTodayPayload(), ScrapeRunRow, TodayResponse, WireArticle, parseJsonStringArray(), LogEvent (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (24): sanitizeErrorDetail(), enforceRateLimit(), RATE_LIMIT_RULES, rateLimitResponse(), RateLimitResult, RateLimitRule, SetTzBodySchema, requireSession() (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (12): signSession(), UserRow, validSessionCookie(), authedRequest(), authedRequestWithRunId(), RunRow, UserRow, authedRequest() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (28): recordChunkCompletion(), normaliseRawDedupGroups(), sanitizeText(), splitIntoParagraphs(), alignLlmArticlesToInputs(), buildAnchorIndices(), buildArticleBatchStatements(), contextualTagSetForCluster() (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (20): base64UrlDecode(), base64UrlEncode(), enc, readCookie(), RFC-6265, verifyHmacSignature(), buildRefreshCookie(), buildSessionCookie() (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (17): DEFAULT_STATUS, ErrorCode, errorResponse(), USER_FACING_MESSAGES, USER_FACING_MESSAGES_FOR_TESTS, forbiddenOriginResponse(), OriginCheckResult, UNSAFE_METHODS (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (21): extractResponsePayload(), extractTokensIn(), extractTokensOut(), AI_GATEWAY_MODEL_PREFIXES, AiBinding, AttemptInfo, gatewayModelParams(), gatewayRequestParams() (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (18): MONTHS, primaryFormatted, primaryIso, Props, safeHref(), AltSourceRow, altSources, altSourcesResult (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (21): ExistingUserRow, mapOAuthError(), OAUTH_ERROR_CODES, OAuthErrorCode, ProviderConfig, userIdFor(), CallbackEnv, errorRedirect() (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (10): clearHealth(), CONSECUTIVE_FETCH_FAILURE_LIMIT, FeedHealthResult, healthKey(), recordFetchResult(), E2E_USER_ID, SYSTEM_USER_ID, KvStub (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (18): countChunkCompletions(), findRecentRunningRun(), kickCoordinator(), RecentRun, tryClaimDispatch(), advancePhase(), markFailed(), PipelineRunRow (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (8): dispatchDailyEmails(), SendEmailParams, SqlCall, TzRow, UserRow, CapturedCall, DispatchUserRow, PreparedCall

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (21): astro/tsconfigs/strict, compilerOptions, allowJs, baseUrl, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, jsx (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (14): Props, redirect(), requireSettingsComplete(), gated, rawSelectedTags, selectedTagSet, sortedUserTags, tagCounts (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (14): readWatermark(), writeWatermark(), ArticleRow, DedupBatchResult, DedupCursor, DEFAULT_BATCH, runHistoricalDedupBatch(), RunHistoricalDedupBatchOptions (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (16): EmailHeadline, HeadlineRow, TagTally, TallyRow, TotalRow, DigestReadyEmailParams, escapeHtml(), headlineRow() (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (19): ArticleRow, BATCH_SIZE, BatchResult, countRemaining(), runOneBackfillBatch(), BgeRunResult, buildEmbeddingInput(), cosineSimilarity() (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (19): article(), ArticleRow, deliver(), Details, Disposition, Ack, Invalid, Pending (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (17): config, name, private, type, version, @astrojs/check, @astrojs/cloudflare, @cloudflare/workers-types (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (10): MIN_JWT_SECRET_BYTES, requireStrongJwtSecret(), getHmacKey(), HEADER_B64, isSessionClaims(), JWT_CLOCK_SKEW_SECONDS, SessionClaims, verifySession() (+2 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (20): revokeAllForUser(), AuthenticatedUser, AuthEnv, CLEAR_BOTH_COOKIES, handleRevokedReplayPath(), loadSession(), loadSessionForPage(), LoadSessionResult (+12 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (10): SESSION_COOKIE_NAME, authedRequest(), MockOpts, RawArticle, ScrapeRunRow, UserRow, WireArticle, WireResponse (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (14): BatchPayload, BatchVerdictEntry, buildBatchUser(), DEFAULT_RERANK_FLOOR, narrowBatchPayload(), readRerankFloor(), RERANK_BATCH_SIZE, RERANK_SYSTEM (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (16): selectUnreadHeadlinesForUser(), tagTallySinceMidnight(), dispatchForTz(), DispatchUserRow, loadDispatchUsers(), processOneUser(), TzRow, sendEmail() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (14): HASHTAG_REGEX, MAX_HASHTAGS, parseHashtags(), SettingsPutBodySchema, TagsPostBodySchema, checkOrigin(), findTagsNeedingDiscovery(), GET() (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (13): addChunkStats(), ChunkStats, finishRun(), nowSeconds(), ScrapeRunSeed, startRun(), encodeRandom(), encodeTime() (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (18): ArticleRow, ArticleSide, buildSide(), DiagError, DiagSuccess, GET(), jsonResponse(), selectArticle() (+10 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (15): BRAND_ONLY_TAGS, CURATED_SOURCES, CURATED_TAGS, CuratedSource, CuratedSourceKind, GOOGLE_NEWS_CURATED_TAGS, googleNewsSourceForTag(), hasCuratedGoogleNews() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.20
Nodes (13): applyHtmlBgInlineStyle(), applyMetaThemeColor(), applyTheme(), BG_BY_THEME, DATA_ATTR, nextTheme(), persistTheme(), persistThemeCookie() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (14): handleBatch(), handleDedupSweepBatch(), handlePipelineJobsBatch(), PipelineJobMessage, handleChunkBatch(), handleCoordinatorBatch(), handleFinalizeBatch(), CRON_HANDLERS (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (13): slugify(), stripHyphens(), data, DayGroup, filteredArticles, HistoryResponse, initialSelectedTagSet, rawDateParam (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (10): ClassifierParams, classifyMatchPair(), ClassifyOutcome, MatchInput, SelfArticle, AGGREGATOR_HOSTS, etldPlusOne(), sameVendor() (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (10): isGoogleNewsUrl(), preferDirectOverGoogleNews(), sharedTitleTokenCount(), SourceFetchResult, TITLE_STOPWORDS, titlesShareAnyToken(), tokenizeTitle(), Headline (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (11): BeforeSwapEvent, bindBrandLinkScrollToTop(), clearAllVtNames(), findPromotableCard(), KEY(), promoteIncomingCardForReturnMorph(), promoteSourceCardForOutgoingMorph(), restoreScroll() (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.23
Nodes (11): onRequest, CSP_HEADER_VALUE, HSTS_HEADER_VALUE, PERMISSIONS_POLICY_VALUE, REFERRER_POLICY_VALUE, SECURITY_HEADERS, securityHeadersMiddleware(), X_CONTENT_TYPE_OPTIONS_VALUE (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (10): esbuild, entries, repoRoot, scriptDir, sources, __dirname, main(), parseEntries() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.23
Nodes (12): applyForeignKeysPragma(), readTimeWindowSeconds(), ArticleRow, AutoCandidate, autoSweepLookbackSeconds(), BorderCandidate, enqueueAutoSweep(), FinalizeJobMessage (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.26
Nodes (10): clearDiscoveryFailure(), DiscoveryRetryBodySchema, executeRetryBulk(), GET(), isEmptyFeedsEntry(), POST(), userHashtags(), isFormEncoded() (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (13): devDependencies, @astrojs/check, @cloudflare/vitest-plugin, @cloudflare/workers-types, esbuild, knip, oxlint, @resvg/resvg-js (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (13): scripts, build, deploy, dev, fixtures, icons, knip, lint (+5 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (5): DEFAULT_HASHTAGS, DELETE_ALL_TAGS_LABEL, RESTORE_DEFAULTS_LABEL, signedCookie(), UserRow

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (8): @cloudflare/vitest-plugin, here, integ, onlyInInteg, onlyInProd, prod, text, tomlPath

### Community 55 - "Community 55"
Cohesion: 0.20
Nodes (10): findAllRefs(), findSddIds(), orphans, refs, ROOT, SCAN_DIRS, sdd, SKIP_PATHS (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.21
Nodes (10): allOffenders, componentDir, componentOffenders, isTypeOnlyImport(), listAstroFiles(), pageOffenders, REPO_ROOT, report (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.30
Nodes (10): Candidate, Cluster, clusterByCanonical(), isDefined(), mergeClusters(), mergeClustersByLlmHints(), pickEarliest(), Survivor (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.18
Nodes (7): BatchHandlerOptions, NonRetryableError, QueueMessageContext, readMaxQueueAttempts(), FakeBody, fakeEnv, { mockLog }

### Community 59 - "Community 59"
Cohesion: 0.26
Nodes (11): POST(), ADMIN_USER_ROW, adminCookieJwt(), buildContextAndCall(), BuildContextOpts, DbFixture, makeAi(), makeDb() (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.38
Nodes (10): applyAnchorOrCentre(), getDialog(), initModal(), onCloseClick(), onDialogClick(), onTriggerClick(), positionAnchored(), teardownModal() (+2 more)

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (4): KvHandles, SqlBinding, UserRow, validSessionCookie()

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (4): ArticleRow, authedToken(), ScrapeRunRow, UserRow

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (6): authedRequest(), Binding, formatInt(), formatReadOfTotal(), Responses, UserRow

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (7): ADMIN_USER_ROW, adminCookieJwt(), AdminSessionFixture, DbFixture, PreparedStmt, QueueFixture, refreshRequest()

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (7): altLabel, displaySourceName, Props, stagger, tagAttr, AltSourceLabel, formatAltSourceLabel()

### Community 66 - "Community 66"
Cohesion: 0.36
Nodes (9): AIRunResponse, escapeControlCharsInJsonStrings(), extractFirstJsonObject(), LLMPayload, parseJsonWithRepairs(), parseLLMJson(), parseLLMPayload(), removeTrailingCommasOutsideStrings() (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (7): key(), serialize(), sourcesCacheRawEqual(), writeSourcesCache(), DiscoveredFeed, SourcesCacheValue, applyEvictions()

### Community 68 - "Community 68"
Cohesion: 0.24
Nodes (9): ArticleRow, callBatch(), CallOpts, DbFixture, ExistenceGuardEntry, KvStore, makeDb(), makeKv() (+1 more)

### Community 69 - "Community 69"
Cohesion: 0.20
Nodes (7): wrangler, built, configPath, redirect, redirectFile, relativePath, source

### Community 70 - "Community 70"
Cohesion: 0.20
Nodes (8): @resvg/resvg-js, iconsDir, repoRoot, scriptDir, sizes, svgFlat, svgPath, svgRaw

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (3): env(), makeKvStub(), UserRow

### Community 72 - "Community 72"
Cohesion: 0.31
Nodes (7): IosNavigatorLike, isIos(), BeforeInstallPromptEvent, initInstallPrompt(), IosNavigator, isIos(), isStandalone()

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (9): POST(), ADMIN_USER_ROW, adminCookieJwt(), CallOpts, callRoute(), DbCalls, makeDb(), makeQueue() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (6): zod, AccountDeleteBodySchema, DELETE(), deleteAccountCore(), deleteUserKvEntries(), POST()

### Community 76 - "Community 76"
Cohesion: 0.42
Nodes (6): BLOCKED_HOSTS, BLOCKED_NAME_TOKENS, filterBlockedPublishers(), hostIsBlocked(), isBlockedPublisher(), textHasBlockedToken()

### Community 77 - "Community 77"
Cohesion: 0.36
Nodes (5): buildMergeStatements(), FinalizeRow, mergeAsAltSource(), pickWinner(), CapturedStatement

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (6): DbCall, makeEnv(), makeMockSweepQueue(), MockDb, MockSweepQueue, MockVectorize

### Community 81 - "Community 81"
Cohesion: 0.32
Nodes (6): App, Cloudflare, Env, Locals, Runtime, WorkerBindings

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (3): ChunkJobMessage, KvState, SqlRecord

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (3): KNOWN_ARTICLE_IDS, sessionCookieFor(), UserRow

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (3): env(), makeKvStub(), UserRow

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (6): ignorePatterns, rules, no-console, no-unused-vars, typescript/no-explicit-any, $schema

### Community 86 - "Community 86"
Cohesion: 0.29
Nodes (7): dependencies, astro, @astrojs/cloudflare, fast-xml-parser, tailwindcss, @tailwindcss/vite, zod

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (3): manifest, ManifestIcon, WebManifest

### Community 88 - "Community 88"
Cohesion: 0.43
Nodes (6): ADMIN_USER_ROW, adminCookieJwt(), callRoute(), DbCalls, makeDb(), makeQueue()

### Community 89 - "Community 89"
Cohesion: 0.40
Nodes (4): Cloudflare, cloudflare:test, Env, ProvidedEnv

### Community 90 - "Community 90"
Cohesion: 0.47
Nodes (4): canonicalize(), isTrackingParam(), TRACKING_PARAM_EXACT, TRACKING_PARAM_PREFIXES

## Knowledge Gaps
- **442 isolated node(s):** `validate-app-url.sh script`, `config`, `_merge_email_winners`, `_merge_user_merges`, `$schema` (+437 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 740 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Community 30` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 48`, `Community 52`, `Community 53`, `Community 54`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 84`, `Community 87`, `Community 88`, `Community 90`, `Community 91`, `Community 92`, `Community 93`, `Community 99`, `Community 100`, `Community 101`?**
  _High betweenness centrality (0.407) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 4` to `Community 0`, `Community 2`, `Community 3`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 25`, `Community 26`, `Community 27`, `Community 31`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 48`, `Community 49`, `Community 58`, `Community 67`, `Community 75`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `astro` connect `Community 4` to `Community 1`, `Community 36`, `Community 37`, `Community 38`, `Community 9`, `Community 75`, `Community 12`, `Community 11`, `Community 46`, `Community 15`, `Community 16`, `Community 49`, `Community 19`, `Community 52`, `Community 24`, `Community 29`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `validate-app-url.sh script`, `config`, `_merge_email_winners` to the rest of the system?**
  _442 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06198198198198198 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06140350877192982 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06095791001451379 - nodes in this community are weakly interconnected._