# Configuration

**Audience:** Operators, Developers

Environment variables, secrets, and platform bindings required to run the system.

## Contents

- [Worker Secrets](#worker-secrets)
- [GitHub Actions Secrets](#github-actions-secrets)
- [Platform Bindings](#platform-bindings)
- [Worker Vars (non-secret)](#worker-vars-non-secret)
- [Cron](#cron)
- [KV Key Conventions](#kv-key-conventions)
- [Compatibility](#compatibility)
- [Observability](#observability)
- [Security Headers](#security-headers)
- [Configuration Files](#configuration-files)
- [Related Documentation](#related-documentation)

---

## Worker Secrets

Stored via `wrangler secret put <name>`. Never committed to git.

| Variable | Purpose | Required | Default | Consumed by | Implements |
| |---|---|---|---|--- | --- |
| `GH_OAUTH_CLIENT_ID` | GitHub OAuth application identifier | Conditional (one OAuth pair required) | none | `src/pages/api/auth/[provider]/login.ts`, `callback.ts` | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `GH_OAUTH_CLIENT_SECRET` | GitHub OAuth application client secret | Conditional (when `GH_OAUTH_CLIENT_ID` set) | none | `src/pages/api/auth/[provider]/callback.ts` | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth application identifier | Conditional (one OAuth pair required) | none | `src/pages/api/auth/[provider]/login.ts`, `callback.ts` | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth application client secret | Conditional (when `GOOGLE_OAUTH_CLIENT_ID` set) | none | `src/pages/api/auth/[provider]/callback.ts` | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `OAUTH_JWT_SECRET` | Session JWT signing and OAuth state HMAC key | Yes | none | `src/pages/api/auth/refresh.ts`, `logout.ts`, `account.ts`, middleware | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-session-lifecycle) |
| `RESEND_API_KEY` | Resend email transport credential | Conditional (email dispatch) | none - email silently skipped when unset | `src/lib/email.ts` | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content), [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `RESEND_FROM` | Digest notification sender | Conditional (when `RESEND_API_KEY` set) | none | `src/lib/email.ts` | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content) |
| `APP_URL` | Canonical application origin for redirects and Origin checks | Yes | none | `src/pages/api/auth/account.ts`, `src/pages/api/tags.ts`, all Origin-check routes | [REQ-AUTH-003](../../sdd/spec/authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints) |
| `AI_GATEWAY_API_TOKEN` | Runtime AI Gateway authentication | Yes | none | `src/lib/llm-json.ts` | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract), [REQ-SET-004](../../sdd/spec/settings.md#req-set-004-model-selection) |
| `AI_GATEWAY_URL` | Runtime AI Gateway endpoint | Yes | none | `src/lib/llm-json.ts` | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract), [REQ-SET-004](../../sdd/spec/settings.md#req-set-004-model-selection) |
| `ADMIN_EMAIL` | Operator identity for admin authorization | Conditional (admin routes) | none - every `/api/admin/*` returns 403 when unset | `src/middleware/admin-auth.ts` | [REQ-AUTH-006](../../sdd/spec/authentication.md#req-auth-006-admin-surface-gating) |
| `CF_ACCESS_AUD` | Optional Cloudflare Access audience check | Optional | none (Layer 0 perimeter skipped when unset) | `src/middleware/admin-auth.ts` | [REQ-AUTH-006](../../sdd/spec/authentication.md#req-auth-006-admin-surface-gating) |
| `DEV_BYPASS_TOKEN` | Integration-only authentication bypass credential | Optional | none - `/api/dev/*` returns 404 when unset | `src/pages/api/dev/login.ts`, `src/pages/api/dev/trigger-scrape.ts` | [REQ-AUTH-010](../../sdd/spec/authentication.md#req-auth-010-dev-bypass-production-guard) |
| `DEV_BYPASS_USER_ID` | Integration synthetic-session identity override | Optional | `__e2e__` (synthetic row) | `src/pages/api/dev/login.ts` | [REQ-AUTH-010](../../sdd/spec/authentication.md#req-auth-010-dev-bypass-production-guard) |

Notes: The deploy workflow derives `AI_GATEWAY_URL` from `CLOUDFLARE_ACCOUNT_ID` and optional repository variable `AI_GATEWAY_NAME` (default `ai-news-digest`), then stores it with `wrangler secret put`. `AI_GATEWAY_API_TOKEN` must be a dedicated runtime Gateway token, not the broader deploy token. The default pipeline model is `openai/gpt-6-luna`; the previous `dynamic/news_digest` route remains documented in code as the rollback path.

The `GH_` prefix on the GitHub OAuth secrets is required because GitHub Actions reserves the `GITHUB_*` namespace for its built-in tokens. `RESEND_FROM` accepts a bare address (`digest@example.com`) or RFC 5322 display-name form (`Acme News <digest@example.com>`); see [RESEND_FROM display-name handling](#resend_from-display-name-handling).

### RESEND_FROM display-name handling

A bare address (e.g., `digest@example.com`) is automatically wrapped in `News Digest <digest@example.com>` display-name format before sending so recipients see a friendly name in their inbox regardless of the stored format. To set a custom display name, store the full RFC 5322 form in the secret (`Acme News <digest@example.com>`); the wrapper only fires when no `<` is present.

### DEV_BYPASS_USER_ID override

Unset is the right value for almost every deployment. When unset, `/api/dev/login` mints sessions for the synthetic `__e2e__` row from `migrations/0006_e2e_user.sql` - this keeps e2e tests from mutating the operator's account. Set this only for unusual cases (e.g., impersonating a specific staging account); the deploy workflow does not propagate the value.

## GitHub Actions Secrets

The deploy job reads these secrets from GitHub Actions. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are deploy credentials; `AI_GATEWAY_API_TOKEN` and the application secrets are pushed to the Worker via `wrangler secret put`. Deploy also deletes any legacy Worker secret named `CLOUDFLARE_API_TOKEN` after listing Worker secrets in JSON form, so the deploy token does not remain available at runtime.

| Variable | Required | Purpose | Default | Consumed by | Implements |
|---|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Yes | Token with Workers Scripts:Edit scope for deployment | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` | [REQ-OPS-006](../../sdd/spec/observability.md#req-ops-006-integration-environment) |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Target Cloudflare account id; also forms the Worker `AI_GATEWAY_URL` | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` | [REQ-OPS-006](../../sdd/spec/observability.md#req-ops-006-integration-environment) |
| `AI_GATEWAY_API_TOKEN` | Yes | Dedicated runtime token for Cloudflare AI Gateway inference; not used for deploy/provisioning | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/lib/llm-json.ts`) | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract), [REQ-SET-004](../../sdd/spec/settings.md#req-set-004-model-selection) |
| `GH_OAUTH_CLIENT_ID` | Conditional | GitHub OAuth App client ID (required when GitHub sign-in is enabled) | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/auth/[provider]/login.ts`, `callback.ts`) | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `GH_OAUTH_CLIENT_SECRET` | Conditional | GitHub OAuth App client secret (required when `GH_OAUTH_CLIENT_ID` is set) | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/auth/[provider]/callback.ts`) | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `GOOGLE_OAUTH_CLIENT_ID` | Conditional | Google OAuth 2.0 client ID (required when Google sign-in is enabled) | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/auth/[provider]/login.ts`, `callback.ts`) | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Conditional | Google OAuth 2.0 client secret (required when `GOOGLE_OAUTH_CLIENT_ID` is set) | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/auth/[provider]/callback.ts`) | [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) |
| `OAUTH_JWT_SECRET` | Yes | 32+ char random string used to HMAC-sign session JWTs | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/auth/refresh.ts`, `logout.ts`, `account.ts`, middleware) | [REQ-AUTH-002](../../sdd/spec/authentication.md#req-auth-002-session-lifecycle) |
| `RESEND_API_KEY` | Conditional | Resend API key for digest emails; when absent the runtime silently skips email dispatch | none - email silently skipped when unset | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/lib/email.ts`) | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content), [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `RESEND_FROM` | Conditional | Sender address for emails; required when `RESEND_API_KEY` is set | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/lib/email.ts`) | [REQ-MAIL-001](../../sdd/spec/email.md#req-mail-001-digest-ready-email-content) |
| `APP_URL` | Yes | Canonical origin (e.g., `https://digest.example.com`); used in emails, OAuth redirect URIs, and CSRF checks | none | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/auth/account.ts`, `src/pages/api/tags.ts`, all Origin-check routes) | [REQ-AUTH-003](../../sdd/spec/authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints) |
| `DEV_BYPASS_TOKEN` | Conditional | Bearer token that enables `/api/dev/login` and `/api/dev/trigger-scrape`; omit in production | none - `/api/dev/*` returns 404 when unset | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/pages/api/dev/login.ts`, `src/pages/api/dev/trigger-scrape.ts`) | [REQ-AUTH-010](../../sdd/spec/authentication.md#req-auth-010-dev-bypass-production-guard) |
| `ADMIN_EMAIL` | Conditional | Operator email that gates `/api/admin/*`; when unset every admin endpoint returns HTTP 403 ([REQ-AUTH-006](../../sdd/spec/authentication.md#req-auth-006-admin-surface-gating)) | none - every `/api/admin/*` returns 403 when unset | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/middleware/admin-auth.ts`) | [REQ-AUTH-006](../../sdd/spec/authentication.md#req-auth-006-admin-surface-gating) |
| `CF_ACCESS_AUD` | Optional | Cloudflare Access audience for `/api/admin/*`; when set, admin requires matching Access assertion, otherwise session + `ADMIN_EMAIL` is the gate ([REQ-AUTH-006](../../sdd/spec/authentication.md#req-auth-006-admin-surface-gating), AD29). See [Setting `CF_ACCESS_AUD`](#setting-cf_access_aud-production-when-binding-cloudflare-access). | none (Layer 0 perimeter skipped when unset) | `.github/workflows/deploy.yml`, `.github/workflows/deploy-integration.yml` (pushes to `src/middleware/admin-auth.ts`) | [REQ-AUTH-006](../../sdd/spec/authentication.md#req-auth-006-admin-surface-gating) |

Optional repository variable: `AI_GATEWAY_NAME` overrides the default Gateway name (`ai-news-digest`) used to build `AI_GATEWAY_URL`. Set it under Settings → Secrets and variables → Actions → Variables when your Cloudflare Gateway uses a different name. The deploy workflows preflight `openai/gpt-6-luna` through this URL before Worker publish.

### AI Gateway setup

Gateway-backed OpenAI provider calls require one Cloudflare setup path before deploying:

1. Create or select a Cloudflare AI Gateway. Use `ai-news-digest` to match the default, or set the repository variable `AI_GATEWAY_NAME` to the Gateway name you chose.
2. Add an OpenAI provider key with access to `gpt-6-luna`.
3. Keep the previous Dynamic Routing route named `news_digest` if you want the built-in rollback path (`dynamic/news_digest`).
4. Create a least-privilege AI Gateway API token for runtime inference and store it as the GitHub Actions secret `AI_GATEWAY_API_TOKEN`. Do not reuse `CLOUDFLARE_API_TOKEN`; that deploy/provisioning token is intentionally deleted from Worker secrets.
5. Confirm `CLOUDFLARE_ACCOUNT_ID` is the account that owns the Gateway.

The workflow builds `AI_GATEWAY_URL` as `https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/compat/chat/completions`. It sends a cache-bypassing `openai/gpt-6-luna` chat-completions request capped at 50 completion tokens before deploy; HTTP 401, 404, provider, or model errors fail the workflow before a broken runtime reaches users.

### Setting `CF_ACCESS_AUD` (production, when binding Cloudflare Access)

`CF_ACCESS_AUD` is optional. Per AD29, Cloudflare Access is opt-in additive perimeter: when this var is unset, admin is gated by signed-in session + `ADMIN_EMAIL` alone - used by forks and integration deploys, which do not need a perimeter check beyond the session + `ADMIN_EMAIL` gate.

For production deploys that DO bind Access, set this var and follow AD30 - bind Access on every public hostname the worker serves OR disable the unbound hostnames:
1. **Set `CF_ACCESS_AUD`** - the audience tag of the Access application fronting the custom domain. The Worker enforces Layer 0 (assertion presence + `aud` claim match) before the baseline session + `ADMIN_EMAIL` checks run.
2. **Bind Access on `*.workers.dev` too OR disable that subdomain** - Workers & Pages → your worker → Settings → Domains & Routes. Unbound `*.workers.dev` bypasses the perimeter; baseline session + `ADMIN_EMAIL` still gates, but the perimeter promise is broken (AD30).

The deploy job also runs `wrangler secret delete DEV_BYPASS_USER_ID` (idempotent, silenced on not-found) on each deploy so any stray value cannot defeat the synthetic `__e2e__` sandbox. The workflow does not propagate this secret; operators who need it must set it manually via `wrangler secret put`.

CI pushes Worker secrets using the file-redirect form because `printf '%s' "$SECRET" | wrangler secret put` stores empty values when `$SECRET` is unset or expands to an empty string under GitHub Actions runners.

## Platform Bindings

Declared in `wrangler.toml`:

| Binding | Type | Purpose | Required | Consumed by | Implements |
|---|---|---|---|---|---|
| `DB` | D1 database | Primary strongly-consistent store - users, articles, scrape_runs, pending_discoveries, stars | Yes | `src/lib/db.ts`, API routes and queue consumers | [CON-DATA-001](../../sdd/spec/constraints.md#con-data-001-strong-consistency-in-d1-edge-cache-in-kv) |
| `KV` | KV namespace | Edge cache for discovered sources, headlines, source health | Yes | `src/lib/kv/`, `src/lib/rate-limit.ts` | [REQ-DISC-001](../../sdd/spec/discovery.md#req-disc-001-per-tag-feed-discovery-queueing-and-pickup) |
| `SCRAPE_COORDINATOR` | Queue producer | Producer binding - one message per every-4-hours cron tick kicks the coordinator | Yes | `src/worker.ts`, `src/queue/scrape-coordinator.ts` | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `SCRAPE_CHUNKS` | Queue producer | Producer binding - one message per ≤8-candidate LLM chunk | Yes | `src/queue/scrape-coordinator.ts`, `src/queue/scrape-chunk-consumer.ts` | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract) |
| `SCRAPE_FINALIZE` | Queue producer | Producer binding - one message per scrape run, enqueued by the last chunk consumer after the run is stamped `ready`; triggers the same-story dedup pass ([REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract)) | Yes | `src/queue/scrape-chunk-consumer.ts`, `src/queue/scrape-finalize-consumer.ts` | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract) |
| `DEDUP_SWEEP` | Queue producer + consumer | Self-chaining queue carrying operator-triggered historical-dedup sweep messages. The kicker (admin route) sends the first message; the consumer processes one batch then re-enqueues a continuation until the corpus tail is reached, decoupling the sweep from the operator's browser tab ([REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1) | Yes | `src/pages/api/admin/historical-dedup.ts`, `src/queue/dedup-sweep-consumer.ts` | [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) |
| `PIPELINE_JOBS` | Queue producer + consumer | Self-chaining queue for the backend-driven full pipeline orchestrator. One consumer walks seven phases by chaining messages; the producer binding is used by the kicker routes. No browser tab dependency ([REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface), [AD37](../decisions/README.md#ad37-full-pipeline-run-is-backend-orchestrated-browser-tab-is-display-only)) | Yes | `src/pages/api/admin/pipeline-run.ts`, `src/queue/pipeline-consumer.ts` | [REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface) |
| `AI` | Workers AI | bge-base-en-v1.5 embedding generation for same-story dedup; non-Gateway model fallback | Yes | `src/lib/embeddings.ts`, `src/lib/llm-json.ts` | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract) |
| `VECTORIZE` | Vectorize index | 768-dim cosine index over every surviving article's embedding; queried in the finalize pass and by the historical re-run sweep ([REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract)) | Yes | `src/lib/embeddings.ts`, finalize and historical sweep consumers | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract) |
| `ASSETS` | Fetcher (static assets) | Cloudflare static-asset binding for serving the Astro-built output; falls back to `new Response('news-digest')` in tests | Production asset delivery | Cloudflare adapter asset handling; test fetch fallback in `src/worker.ts` | [REQ-PWA-001](../../sdd/spec/pwa.md#req-pwa-001-installable-pwa-manifest) |

All five queue consumers (`SCRAPE_COORDINATOR`, `SCRAPE_CHUNKS`, `SCRAPE_FINALIZE`, `DEDUP_SWEEP`, `PIPELINE_JOBS`) run with `max_batch_size = 1` (one isolate per message) and `max_retries = 3`. The `SCRAPE_FINALIZE` and `PIPELINE_JOBS` consumers have a DLQ (`ai-news-dlq`) configured so terminal retry exhaustion is inspectable rather than silently dropped (CF-001); the DLQ queue is provisioned by the deploy workflow, not bound in the Worker code.

### Stored model preference

The settings form hides the model picker but round-trips the stored `model_id`, falling back to the server default when none is stored. The settings API validates and persists that preference, so it remains part of the persistence contract even without a visible picker ([REQ-SET-004](../../sdd/spec/settings.md#req-set-004-model-selection)). Source: `src/pages/settings.astro`, `src/pages/api/settings.ts`, and `src/lib/models.ts`. <!-- @impl: src/pages/settings.astro::currentModelId --> <!-- @impl: src/pages/api/settings.ts::PUT -->

## Worker Vars (non-secret)

Declared in `wrangler.toml` under `[vars]`. Forks may override per-environment via `[env.<name>.vars]`.

| Variable | Purpose | Default | Required | Consumed by | Implements |
| |---|---|---|---|--- | --- |
| `QUEUE_MAX_RETRIES` | Queue redelivery budget | `"3"` | Yes | `src/queue/*.ts` consumer batch handlers | [REQ-PIPE-002](../../sdd/spec/generation.md#req-pipe-002-chunked-llm-output-content-contract) |
| `DEDUP_COSINE_THRESHOLD` | Automatic same-story cosine threshold | `"0.88"` | Yes | `src/lib/embeddings.ts` (`readCosineThreshold`), `src/queue/scrape-finalize-consumer.ts`, `src/pages/api/admin/dedup-diag.ts` | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract) |
| `DEDUP_TIME_WINDOW_SECONDS` | Same-news-cycle matching window | `"604800"` (7d) | Yes | `src/lib/embeddings.ts`, `src/queue/dedup-sweep-consumer.ts` | [REQ-PIPE-012](../../sdd/spec/generation.md#req-pipe-012-same-story-matching-policy-variants) AC 3 (same-news-cycle window), [REQ-PIPE-013](../../sdd/spec/generation.md#req-pipe-013-same-story-cross-tick-automation-and-retention-coupling) AC 3 |
| `DEDUP_SAME_VENDOR_PENALTY` | Same-publisher cosine penalty | `"0.05"` | Yes | `src/lib/embeddings.ts` | [REQ-PIPE-012](../../sdd/spec/generation.md#req-pipe-012-same-story-matching-policy-variants) AC 2 |
| `DEDUP_RERANK_FLOOR` | Lower cosine bound for LLM judgment | `"0.70"` | Yes | `src/lib/dedup-rerank.ts` | [REQ-PIPE-023](../../sdd/spec/generation.md#req-pipe-023-llm-re-rank-cost-controls) |
| `DEDUP_HIGH_CONFIDENCE_COSINE` | Deterministic near-duplicate cosine threshold | `"0.92"` | Yes | `src/lib/embeddings.ts` | [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe---core-matching-contract) AC 3 (deterministic collapse) |
| `IS_PRODUCTION` | Fail-closed production guard for developer routes | `"true"` (prod), `"false"` (integration) | Yes | `src/pages/api/dev/login.ts`, `src/pages/api/dev/trigger-scrape.ts`, `src/pages/api/auth/[provider]/callback.ts` | [REQ-AUTH-010](../../sdd/spec/authentication.md#req-auth-010-dev-bypass-production-guard) |

The 0.88 default is the post-2026-05-08 calibration ([AD39](../decisions/README.md#ad39-raise-dedup-auto-merge-threshold-to-088-and-gate-merges-to-a-72h-news-cycle-window)). The prior 0.78 missed the dense-theme failure mode: independent articles on a broad topic routinely cosine-match in the 0.78-0.86 band on topical overlap alone, producing a 13-source false-merge cluster spanning 9 days. 0.88 pushes auto-merge above that band; the 0.70-0.88 stripe goes to LLM rerank.

The 7d time window (bumped 2026-05-11 from 72h) covers valuation-week and long-weekend reverberation clusters while keeping the auto-sweep Vectorize cost bounded; it also governs the auto-sweep lookback cursor so the cursor scope and the per-pair gate always match. The 0.92 high-confidence bar above the threshold catches near-duplicate-headline pairs (wire syndication) deterministically without re-litigating the threshold calibration; 0.92 was picked because wire-syndication near-duplicates dominate the band at or above that cosine, while the 0.88-0.92 stripe still benefits from the LLM rerank pass for borderline cases.

These three constants are calibrated against the bge-base-en-v1.5 cosine distribution on the current corpus. Re-validate them via `src/pages/api/admin/dedup-diag.ts` if the embedding model is swapped or the corpus grows by a factor of 10 or more - either shifts the cosine band and the calibration sweep has to re-run. To tune the rerank band, adjust `DEDUP_RERANK_FLOOR`; setting it equal to `DEDUP_COSINE_THRESHOLD` disables rerank without removing the code path.

## Cron

Four triggers are declared in `wrangler.toml`:

| Schedule | Purpose | REQ |
|---|---|---|
| `0 */4 * * *` | Global-feed coordinator (00/04/08/12/16/20 UTC) | [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence) |
| `0 3 * * *` | Daily retention + refresh-token purge | [REQ-PIPE-005](../../sdd/spec/generation.md#req-pipe-005-fourteen-day-retention-with-starred-exempt-cleanup), [REQ-AUTH-012](../../sdd/spec/authentication.md#req-auth-012-refresh-token-retention-floor-for-reuse-detection) |
| `*/5 * * * *` | Email dispatcher | [REQ-MAIL-003](../../sdd/spec/email.md#req-mail-003-digest-ready-email-send-policy) |
| `2,12,22,32,42,52 * * * *` | Pending-discovery drain every 10 minutes | [REQ-DISC-001](../../sdd/spec/discovery.md#req-disc-001-per-tag-feed-discovery-queueing-and-pickup) |

**Daily 03:00 UTC tick:** removes articles older than 14 days (starred articles are exempt). Also purges expired and old-revoked rows from the `refresh_tokens` table; the 7-day grace on revoked rows preserves reuse-detection history per [REQ-AUTH-012 AC 1](../../sdd/spec/authentication.md#req-auth-012-refresh-token-retention-floor-for-reuse-detection).

**Every-5-minute tick:** per-user email dispatcher fan-out sends digests to users in their local-day window.

**Every-10-minute discovery tick:** pending-discovery drain runs LLM source discovery for newly added tags. It is offset by 2 minutes from the email cron so the two workloads do not share the same isolate budget.

## KV Key Conventions

The `KV` namespace uses a structured key scheme. All keys are shared across all users unless noted.

| Key pattern | Value shape | TTL | Purpose |
|---|---|---|---|
| `sources:{tag}` | `{ feeds: [{ name, url, kind }], discovered_at }` | None (permanent until evicted) | Shared LLM-discovered feeds; written by discovery cron, cleared by retry or feed eviction, and swept when no user owns the tag ([REQ-PIPE-007](../../sdd/spec/generation.md#req-pipe-007-orphan-tag-source-cleanup)) |
| `discovery_failures:{tag}` | per-tag failure counter (string integer) | - | Per-tag failure bookkeeping; cleared by `POST /api/admin/discovery/retry`; also swept by the daily orphan-tag cleanup when the tag is no longer owned by any user ([REQ-PIPE-007](../../sdd/spec/generation.md#req-pipe-007-orphan-tag-source-cleanup)) |
| `source_health:{url}` | Consecutive failure count (UTF-8 integer string) | 7 days | Per-URL fetch-health counter; incremented on each failed fetch, deleted on success. When the count reaches 30 (`CONSECUTIVE_FETCH_FAILURE_LIMIT`) the coordinator evicts the URL from its `sources:{tag}` entry. Implements [REQ-DISC-003](../../sdd/spec/discovery.md#req-disc-003-self-healing-feed-health-tracking). |
| `headlines:{source}:{tag}` | Array of headline objects | 10 min (600 s) | Per-source/per-tag headline cache shared across all chunk invocations within a single scrape run. Implements [REQ-PIPE-001](../../sdd/spec/generation.md#req-pipe-001-global-scrape-and-summarise-pipeline-on-a-fixed-cadence). |
| `dedup:auto_sweep_watermark` | Unix seconds as UTF-8 integer string | None (permanent until invalidated) | Last successful auto-sweep completion; older borderline pairs skip deterministic rerank per [AD48](../decisions/README.md#ad48-dedup-cost-reduction-borderline-rerank-watermark-batched-rerank-call-pipeline-wide-gpt-oss-20b). |
| `ratelimit:{routeClass}:{identity}:{windowIndex}` | Integer string | Window size | Rate-limit counters; see [Rate-limit rules](#rate-limit-rules) below. Implements [REQ-RATE-001](../../sdd/spec/rate-limits.md#req-rate-001-application-layer-rate-limits-on-the-auth-and-mutation-surface). |

`writeWatermark` writes `dedup:auto_sweep_watermark` when the sweep finishes. `clearWatermark` deletes it on `embed-backfill?reembed=1` because new embeddings change cosine geometry; a missing key means always rerank. Source anchors: `src/lib/dedup-watermark.ts`, `src/pages/api/admin/embed-backfill.ts`.

### Rate-limit rules

| Rule | Limit | Scope | Fail mode |
|---|---|---|---|
| `auth_login` | 10 / 60s | IP | Fail closed ([AD23](../decisions/README.md#ad23-auth-rate-limit-fail-closed-without-waf-backstop)) |
| `auth_callback` | 20 / 60s | IP | Fail closed ([AD23](../decisions/README.md#ad23-auth-rate-limit-fail-closed-without-waf-backstop)) |
| `auth_refresh_ip` | 60 / 60s | IP | Fail closed |
| `auth_refresh_user` | 30 / 60s | User | Fail closed |
| `auth_logout` | 5 / 60s | IP | Fail open |
| `article_star` | 60 / 60s | User | Fail open |
| `tags_mutation` | 30 / 60s | User | Fail open |
| `set_tz` | 30 / 60s | User | Fail open |
| `discovery_status` | 120 / 60s | User | Fail open |
| `admin_force_refresh` | Per-operator hourly bucket | User | Fail open (surfaced as 429 with Retry-After) |
| `admin_pipeline_run` | Per-operator hourly bucket | User | Fail open (surfaced as 429 with Retry-After) |

The `auth_refresh_*` buckets are shared between `POST /api/auth/refresh` (`src/pages/api/auth/refresh.ts`) and the inline middleware refresh path (`src/middleware/auth.ts`) so an attacker cannot pivot to authenticated GET routes to bypass the explicit endpoint's limit ([REQ-AUTH-008](../../sdd/spec/authentication.md#req-auth-008-refresh-token-rotation-and-per-device-logout)).

`set_tz` and `discovery_status` cover authenticated endpoints that legitimate clients poll on a sub-minute cadence. They key by user id and fail open so a KV outage does not degrade the settings UX.

The fail-mode split exists because sign-in must remain reachable during a KV outage - locking everyone out is worse than letting through a brief burst - while a stolen refresh cookie must not benefit from the same outage to bypass its limit.

## Compatibility

`compatibility_date = "2026-04-01"` with `compatibility_flags = ["nodejs_compat"]`. The `nodejs_compat` flag is required because the OG-image render path (`@resvg/resvg-js`) and the Resend SDK import Node built-ins (`node:buffer`, `node:stream`) at module load. The Worker runtime is otherwise web-standard.

## Observability

`[observability] enabled = true` - enables Cloudflare Workers Observability (structured log ingestion from `console.log`). See [REQ-OPS-001](../../sdd/spec/observability.md#req-ops-001-structured-json-logging) for the log envelope format.

## Security Headers

Security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are applied by `src/middleware/security-headers.ts` on every response. No configuration is required - the policy is hardcoded and tested byte-for-byte. See [REQ-OPS-003](../../sdd/spec/observability.md#req-ops-003-content-security-policy-on-every-response) for the exact header values.

## Configuration Files

| File | Purpose |
|---|---|
| `wrangler.toml` | Cloudflare Worker config: name, compatibility date, D1/KV/Queue/AI bindings, cron triggers |
| `astro.config.mjs` | Astro adapter (`@astrojs/cloudflare`), [local PWA bridge](../../scripts/pwa-integration.mjs) (`vite-plugin-pwa`), Tailwind Vite plugin (`@tailwindcss/vite`) |
| `sdd/spec/config.yml` | SDD workflow config: mode, `enforce_tdd`, test globs, allowlists |

---

## Related Documentation

- [Deployment](deployment.md) - How to set these up in dev and prod
- [Architecture](architecture.md) - Where these bindings are used
