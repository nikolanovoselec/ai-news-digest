# Deployment

<!-- doc-allow-large: AD46a deployment-doc colocation -->
<!-- doc-allow-mixed-shape: AD46d deployment hybrid runbook-and-registry rendering -->

**Audience:** Developers, Operators

Local development setup and production deployment steps.

## Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Tests](#tests)
- [Production Deployment](#production-deployment)
- [Integration deployment](#integration-deployment)
- [Cloudflare Resources](#cloudflare-resources)
- [Dependency Automation](#dependency-automation)
- [Admin-only routes (Cloudflare Access gating)](#admin-only-routes-cloudflare-access-gating)
- [Resend domain verification](#resend-domain-verification)
- [Related Documentation](#related-documentation)

---

## Prerequisites

- Node.js 22+ (local dev only; production runs on Cloudflare Workers)
- Cloudflare account with Workers Paid plan enabled
- Cloudflare AI Gateway with a deployed Dynamic Routing route named `news_digest` (called as model `dynamic/news_digest`) and provider keys for the route's model nodes
- At least one OAuth provider configured: GitHub (Settings → Developer Settings → OAuth Apps) and/or Google (console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs)
- Resend account with a verified sending domain
- `wrangler` CLI installed (`npm i -g wrangler` or use `npx wrangler`)

## Local Development

**When:** Initial setup or after pulling new migrations.
**Command:**
```bash
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```
**Verifies:** Dev server reachable at `http://localhost:4321`.
**Rollback:** Stop the dev server (`Ctrl+C`). No production state is affected.

The dev server runs at `http://localhost:4321`.

## Tests

```bash
npm test
```

Tests reference a REQ ID in the test name so `spec-reviewer` can verify automated coverage:

```typescript
test('REQ-AUTH-003: rejects state-changing requests without matching Origin', () => {
  // ...
});
```

Import `env` and `applyD1Migrations` from `tests/fixtures/cloudflare-test.ts` (not `cloudflare:test` directly) — the fixture strips deprecated-JSDoc warnings.

## Production Deployment

**When:** Automatic on merge to `main` (gated on PR Checks success). Manual re-run via Actions → Deploy → Run workflow. The `workflow_run` trigger additionally requires `event == 'push'` and `head_repository.full_name == github.repository`; fork PRs whose head branch is named `main` do not trigger deploy regardless of PR Checks outcome (see AD49).
**Command:**
```bash
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
```
**Verifies:** AI Gateway preflight succeeds, then smoke test `GET /` against `APP_URL` returns `200` or `303` (step 7 of the deploy job).
**Rollback:** Cloudflare Workers supports instant rollback via the dashboard or CLI. To revert to the previous Worker version:
```bash
# List recent deployments and find the previous version ID
npx wrangler deployments list
# Roll back to a specific version
npx wrangler rollback <deployment-id>
```
After rollback, verify `GET $APP_URL` returns `200`/`303`. D1 migrations are forward-only — if the bad deploy included a schema migration, coordinate the rollback with a matching reverse migration or restore from a D1 backup before reverting the Worker.

CI/CD: `.github/workflows/deploy.yml` triggers on a `workflow_run` event — fires only when "PR Checks" on `main` completes with `success`. `workflow_dispatch` is retained for manual re-runs.

The deploy job:

1. Applies D1 migrations with drift tolerance: duplicate-column/already-exists results stamp `d1_migrations` and retry; real SQL errors fail immediately. This protects incident-response migrations already applied remotely.

2. Runs the same two-step security audit as PR Checks (advisory HIGH+, blocking CRITICAL) as a defence-in-depth gate for CVEs introduced between merge and deploy.

3. Preflights Cloudflare AI Gateway through the configured `AI_GATEWAY_URL`; 401, 404, missing-route, provider-missing, or model-missing responses stop deploy before Worker publish.

4. Pushes Worker secrets via `wrangler secret put` (file-redirect form). Conditional secrets are pushed only when the matching GitHub Actions secret is non-empty.

5. Deploys the Worker.

6. Binds the custom domain extracted from `APP_URL` via the Workers Custom Domains API. Idempotent.

7. Smoke-tests `GET /` against `APP_URL`. Accepts `200` or `303`.

`scripts/e2e-test.sh` is manual only (`bash scripts/e2e-test.sh --force-prod`) and not part of CI deploy — running it triggers a full LLM-cost scrape and mutates the owner's account.

### Playwright E2E (live)

Manually-triggered browser-side coverage that complements the curl-driven `e2e-test.sh`. Workflow file: `.github/workflows/playwright-e2e.yml`.

**What it covers:**
- View-transition snapshots
- Per-path scroll save / restore
- Navigation correctness on `/digest` and `/history` back-nav (URL transitions cleanly, originating card remains in DOM)

**What it does NOT cover:**
- The morph-pair structural contract lives in `tests/layouts/base.test.ts` — Playwright cannot observe Astro lifecycle timing from outside the browser, so a static source-grep is the right layer for that class.
- The history-vs-digest perf-comparability test is permanently skipped (see [AD14](../decisions/README.md#ad14-history-page-perf-comparability-test-permanently-skipped)).

**How to run:** Actions tab → `Playwright E2E (live)` → Run workflow. Optional `base_url` input targets a preview deploy.

**Required secret:** `DEV_BYPASS_TOKEN` (must match the Worker secret on the target deployment).

**Sandbox:** Mutations are scoped to the synthetic `__e2e__` user. Implements [REQ-READ-002](../../sdd/spec/reading.md#req-read-002-article-detail-view-rendering), [REQ-HIST-001](../../sdd/spec/history.md#req-hist-001-day-grouped-article-history).

> **Fork-friendly:** set `APP_URL` to a custom-domain hostname whose apex is a zone in the same Cloudflare account. The deploy binds it automatically.

### Environment-specific configuration

| Environment | Branch | Hostname source | Trigger | Crons |
|---|---|---|---|---|
| Development | `develop` | (no deploy) | PR Checks (`test.yml`) fire on every push | n/a |
| Integration | `develop` | `vars.APP_URL` on the `integration` GitHub Environment | Manual (Actions → Deploy Integration) | OFF (explicit `[env.integration.triggers] crons = []` in `wrangler.toml` — omitting the block would inherit the top-level cron array) |
| Production | `main` | `secrets.APP_URL` (repo-level) | Auto on merge to main, gated on PR Checks success | ON |

## Integration deployment

**When:** Manually triggered via Actions → "Deploy Integration" → Run workflow. Triggered from `develop` branch only.
**Command:** Actions tab → `Deploy Integration` → Run workflow. No CLI command needed.
**Verifies:** Open `APP_URL` (integration hostname) in a browser. CI smoke step is absent (GHA runner IPs return `403` from Cloudflare bot management); `wrangler deploy` exit code is the success signal.
**Rollback:** Re-trigger the workflow from the previous `develop` commit. Integration has no production traffic; redeploying is safe.

**Purpose:** Smoke-test risky changes (major dependency bumps, schema migrations, CSP tightening, animation rewrites) on the live Cloudflare edge before they reach production. Implements [REQ-OPS-006](../../sdd/spec/observability.md#req-ops-006-integration-deployment-target). Architectural decision: [AD12](../decisions/README.md#ad12-integration-env-separate-cloudflare-resources-manual-trigger-from-develop-crons-disabled).

**Workflow file:** `.github/workflows/deploy-integration.yml`

**Cloudflare resources** (integration-owned resources use `-integration`; AI Gateway uses the configured Gateway name and is shared by default unless `AI_GATEWAY_NAME` points at an integration-specific Gateway):

| Resource | Name |
|---|---|
| Worker | `ai-news-digest-integration` |
| D1 | `ai-news-digest-integration` |
| KV | `ai-news-digest-integration-kv` (auto-derived) |
| Queues | `scrape-coordinator-integration`, `scrape-chunks-integration`, `scrape-finalize-integration`, `dedup-sweep-integration`, `pipeline-jobs-integration` |
| DLQ | `ai-news-dlq-integration` (unbound; receives terminal retry exhaustion from finalize + pipeline-jobs consumers) |
| AI Gateway | `AI_GATEWAY_NAME` repo/environment variable, default `ai-news-digest` (shared); set an integration-specific Gateway name to isolate and ensure it has the `news_digest` Dynamic Routing route plus provider keys |
| Workers AI | shared `AI` binding for embeddings (no per-env isolation needed) |
| Vectorize | `ai-news-embeddings-integration` |

**One-time per-fork setup:**

1. **Create the AI Gateway path.**
   - Create or choose a Cloudflare AI Gateway named `ai-news-digest`.
   - For a different name, set variable `AI_GATEWAY_NAME`.
   - Add provider keys for whichever models the route will call.
   - Create and deploy a Dynamic Routing route named `news_digest`.
   - Store the least-privilege Gateway token as secret `AI_GATEWAY_API_TOKEN`.

2. **Create the GitHub Environment.** Repo → Settings → Environments → New environment → name it `integration`. The empty environment activates secret-fallback semantics.

3. **Set `APP_URL` as an environment variable** (Variables tab, not Secrets). Use a same-account custom domain URL; the workflow requires it before deploy.

4. **Confirm the OAuth callback URL is registered** with providers: `${APP_URL}/api/auth/google/callback` and/or `${APP_URL}/api/auth/github/callback`.

5. **(Optional) Override config per-env.** Environment Secrets can override `OAUTH_JWT_SECRET` and `AI_GATEWAY_API_TOKEN`. Environment Variables can override `AI_GATEWAY_NAME`.

**How to deploy:**

1. Land the change on `develop` (PR-merged or direct push).
2. GitHub → Actions → "Deploy Integration" → "Run workflow" → green button.
3. The branch dropdown in the dispatch dialog is irrelevant — the workflow always pulls `develop`'s current HEAD.
4. ~3 minutes for first-deploy (resources provisioned), ~2 minutes for subsequent deploys.
5. After deploy, open the URL in a browser. No CI smoke step — GHA runner IPs return `403` from Cloudflare bot management regardless of worker health. `wrangler deploy` exit code is the success signal.

**Triggering a scrape on integration** (since crons are off):

Use the **Refresh articles** button on `/settings` (Administration section) — the button navigates the browser to `/api/admin/pipeline-run?mode=full` via `window.location.assign()` (top-level navigation is required because CF Access protects `/api/admin/*` and a `fetch()` in CORS mode cannot follow the cross-origin SSO redirect; see [AD38](../decisions/README.md#ad38-cf-access-protected-admin-endpoints-must-be-invoked-via-top-level-navigation-not-fetch)), the endpoint enqueues a `pipeline-jobs` message and `303`s back to `/settings?pipeline=enqueued&pipeline_run_id=...`; the queue consumer then walks the seven phases server-side without depending on the operator's tab ([REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface), [AD37](../decisions/README.md#ad37-full-pipeline-run-is-backend-orchestrated-browser-tab-is-display-only)). For scripted or headless runs:

```bash
# Sign in at your APP_URL (or use the dev-bypass runbook below), then:
curl -i ${APP_URL}/api/admin/force-refresh
```

**Promotion path** is one-way: develop → integration verify → develop merged to main → production auto-deploy. No path pushes integration changes back to develop.

**Secret resolution.** `environment: integration` enables GitHub's standard secret-resolution fallback: env-scoped secret wins when defined, otherwise the repo-level secret is used. Default state with no env-scoped secrets matches running without env scoping at all — which is exactly what you want when reusing prod credentials on integration.

## Cloudflare Resources

| Resource | Type | Name | Purpose |
|---|---|---|---|
| `DB` | D1 database | `ai-news-digest` | Primary store |
| `KV` | KV namespace | `ai-news-digest-kv` (auto-created on first deploy by the deploy workflow's inline `wrangler kv namespace list / create` block; the resolved id is patched into wrangler.toml in CI) | Caches (headlines, sources, health) |
| `SCRAPE_COORDINATOR` | Queue | `scrape-coordinator` | Every-4-hours coordinator dispatch (00/04/08/12/16/20 UTC) |
| `SCRAPE_CHUNKS` | Queue | `scrape-chunks` | LLM chunk jobs |
| `SCRAPE_FINALIZE` | Queue | `scrape-finalize` | Same-story dedup pass; one message enqueued by the last chunk consumer per scrape run ([REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract)) |
| `DEDUP_SWEEP` | Queue | `dedup-sweep` | Self-chaining historical-dedup sweep; the kicker enqueues the first message and the consumer re-enqueues a continuation per batch until the corpus tail is reached ([REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1) |
| `PIPELINE_JOBS` | Queue | `pipeline-jobs` (`pipeline-jobs-integration` on integration) | Backend-driven full pipeline orchestrator; one consumer walks the seven phases by self-chaining messages ([REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface), [AD37](../decisions/README.md#ad37-full-pipeline-run-is-backend-orchestrated-browser-tab-is-display-only)) |
| — | Queue (DLQ) | `ai-news-dlq` (`ai-news-dlq-integration` on integration) | Dead-letter queue for the finalize and pipeline-jobs consumers. Terminal queue retry exhaustion lands messages here so they are inspectable rather than silently dropped (CF-001). Provisioned by the deploy workflow inline `wrangler queues create` block; no binding needed in `wrangler.toml`. |
| AI Gateway | Cloudflare AI Gateway | configured by `AI_GATEWAY_URL` | Dynamic route `dynamic/news_digest` for summaries, discovery, and rerank; deploy preflight verifies the Gateway, route, runtime token, and route provider keys before publish |
| `AI` | Workers AI | (account-level) | bge-base-en-v1.5 embedding generation; non-Gateway model fallback |
| `VECTORIZE` | Vectorize index | `ai-news-embeddings` | 768-dim cosine index for same-story dedup; provisioned by the deploy workflow via `wrangler vectorize create` ([REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract)) |

## Dependency Automation

Dependabot is configured (`.github/dependabot.yml`) to open weekly PRs every Monday at 06:00 UTC. It covers:

- **npm** — runtime deps get individual PRs; dev deps are grouped into one PR per week to keep review surface manageable.
- **GitHub Actions** — action pin bumps are PRed automatically, preventing slow-drip deprecation warnings (e.g., Node.js 20 → 22 runner transitions, CodeQL v3 → v4 upgrades).

### PR Checks — CI gates (`test.yml`)

Every push to `develop` (and every PR targeting `main`) runs the following gates in order. All must pass before the deploy workflow fires:

| Step | Command | What it enforces |
|---|---|---|
| Install | `npm install --no-fund --no-audit` | Dependency resolution |
| Security audit (advisory) | `npm audit --omit=dev --audit-level=high` (continue-on-error) | HIGH+ advisories surface in the CI log for operator triage via Dependabot but never block the build — the Worker runtime is `workerd`, not Node.js, so most HIGH findings live in build tooling that never reaches the deployed bundle. |
| Security audit (blocking) | `npm audit --omit=dev --audit-level=critical` | Blocks on CRITICAL CVEs in the production-dep tree. |
| Lint | `npm run lint` | Oxlint rules |
| REQ backlink coverage | `node scripts/check-req-backlinks.mjs` | Every `REQ-X-NNN` reference in `src/`, `tests/`, `documentation/`, and `migrations/` resolves to a header in `sdd/`. Fails the build if any reference points at a REQ ID that does not exist in the spec (CF-069). |
| Wrangler vars parity | `node scripts/check-wrangler-vars-parity.mjs` | Every `[vars]` key declared in the top-level `wrangler.toml` also exists in `[env.integration.vars]` and vice versa, so production and integration never drift apart silently (CF-016). Operator-facing: a missing var on either side surfaces here before the deploy workflow runs. |
| Dead code | `npm run knip` | No unused exports or files |
| Unit + integration tests | `npx vitest run` | Vitest suite |

**Why the audit gates on CRITICAL only:** the deployed bundle runs on `workerd`, not Node.js, so most HIGH+ advisories live in build tooling and never reach production. CRITICAL still blocks the worst CVEs; HIGH+ remains visible in CI logs for Dependabot triage. The deploy job re-runs the same CRITICAL check as defence-in-depth.

When the REQ backlink gate fails, either the referenced REQ-ID needs to be added to `sdd/` (if it is a new requirement), or the stale reference in the source/doc file needs to be updated to point at the correct live REQ.

## Admin-only routes (Cloudflare Access gating)

A handful of operator endpoints drive LLM calls or queue work on demand — budget-sensitive operations reachable only by the site operator. The Worker gate is the security boundary; Cloudflare Access (when bound) is an additive perimeter that improves UX:

| Layer | Role | Implementation |
|---|---|---|
| **Worker-side gate** (`src/middleware/admin-auth.ts`) | **Security boundary.** Always enforced; sufficient on its own. | Baseline: session cookie + `ADMIN_EMAIL` match. Optional Layer 0 (AD29): `aud`-claim check when `CF_ACCESS_AUD` is set. Implements [REQ-AUTH-001](../../sdd/spec/authentication.md#req-auth-001-sign-in-with-a-federated-identity-provider) AC 8. |
| **Cloudflare Access** (zone-level) | **Optional UX + perimeter layer.** When bound, redirects unauthenticated browsers to the Access login page. | Not required for the Worker gate to function. Forks and integration deploys without Access bound use the baseline Worker gate alone (AD29). |

The Worker gate enforces checks in order: when `CF_ACCESS_AUD` is set, the request must carry a Cloudflare Access assertion whose `aud` claim matches before the baseline session check runs; returns at the first failing layer with no observable side effect.

### Setting `CF_ACCESS_AUD` and the `*.workers.dev` perimeter (production)

When Access is bound to the custom domain, follow AD30: also bind it to the auto-assigned `*.workers.dev` URL OR disable that subdomain in Workers & Pages → Settings → Domains & Routes. Without this, an attacker hitting the worker via the unbound `workers.dev` URL bypasses the Access perimeter entirely (the baseline Worker gate still enforces session + ADMIN_EMAIL, but the Access layer's promise is broken).

See [Configuration: Setting `CF_ACCESS_AUD`](configuration.md#setting-cf_access_aud-production-when-binding-cloudflare-access) for the full setup flow.

### Paths to gate

Every admin endpoint sits under `/api/admin/*` so a **single wildcard rule** covers them all and any future endpoint added under that prefix.

| Path | What it does |
|---|---|
| `/api/admin/force-refresh` | Manually kicks the global-feed coordinator (every-4-hours cron). Implements [REQ-OPS-005](../../sdd/spec/observability.md#req-ops-005-admin-force-refresh-endpoint). Backs phase 1 of **Refresh articles** ([REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface)) and is reachable directly for scripted callers. |
| `/api/admin/embed-backfill` | Resumable embedding backfill. `POST ?reembed=1` re-embeds the corpus; plain `POST` drains only `NULL`/`'failed'` rows. Backs phases 0 and 3 of **Refresh articles** ([REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface)). Implements [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract). See [Admin API Reference](api-reference-admin.md#post-apiadminembed-backfill). |
| `/api/admin/historical-dedup` | Starts the oldest-first same-story sweep on `DEDUP_SWEEP`; no-body `POST` enqueues a run, while JSON `{cursor, batch}` runs one legacy/dev-bypass batch. Implements [REQ-PIPE-003](../../sdd/spec/generation.md#req-pipe-003-same-story-dedupe-core-matching-contract) AC 3 and [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1/4. See [Admin API Reference](api-reference-admin.md#post-apiadminhistorical-dedup). |
| `/api/admin/dedup-status` | Polls the `dedup_runs` audit row for a queue-driven sweep. GET with `?run_id=<ULID>` returns running counters and terminal status. Backs the operator-surface progress banner. Implements [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 1/2. See [Admin API Reference](api-reference-admin.md#get-apiadmindedup-status). |
| `/api/admin/dedup-diag` | Returns cosine similarity, adjusted score, same-vendor penalty, and merge decision for a given article pair. Diagnostic only; no writes. Implements [REQ-PIPE-014](../../sdd/spec/generation.md#req-pipe-014-same-story-operator-surfaces) AC 4. See [Admin API Reference](api-reference-admin.md#get-apiadmindedup-diag). |
| `/api/admin/pipeline-run` | Kicker for the backend-driven full pipeline run. POST (JSON body) for scripts; GET (`?mode=`) for browser navigation via CF Access (see [AD38](../decisions/README.md#ad38-cf-access-protected-admin-endpoints-must-be-invoked-via-top-level-navigation-not-fetch)). Implements [REQ-OPS-008](../../sdd/spec/observability.md#req-ops-008-unified-admin-pipeline-run-trigger-from-the-settings-surface). See [Admin API Reference](api-reference-admin.md#post-apiadminpipeline-run). |
| `/api/admin/pipeline-status` | Polling endpoint for a backend pipeline run. `?id=<ULID>` returns the `pipeline_runs` row plus nested scrape + dedup snapshots; omit `id` to recover the most recent run. See [Admin API Reference](api-reference-admin.md#get-apiadminpipeline-status). |
| `/api/admin/discovery/retry` | Re-queues a single tag for LLM-assisted source discovery. |
| `/api/admin/discovery/retry-bulk` | Re-queues every "stuck" (empty-feeds) tag for the session user in one shot — backs the **Discover missing sources** button on `/settings`. |

### Browser invocation pattern for Access-gated endpoints

CF Access protects `/api/admin/*` by intercepting unauthenticated requests and redirecting through an SSO flow. A `fetch()` call in CORS mode cannot follow a cross-origin redirect that sets the `CF_Authorization` cookie - the browser blocks it with a network error regardless of the user's auth state.

**Rule:** every state-changing admin endpoint invoked from the browser must use `window.location.assign(url)` (top-level navigation) and respond with a `303 See Other` redirect. The redirect target should encode the outcome as URL parameters so the settings page can read them on load.

This pattern is already used by `force-refresh.ts` and `pipeline-run.ts`. Do not use `fetch()` for new endpoints under `/api/admin/*`. See [AD38](../decisions/README.md#ad38-cf-access-protected-admin-endpoints-must-be-invoked-via-top-level-navigation-not-fetch) for full rationale and the `Sec-Fetch-Site` constraint.

### Setup (one-time, operator console)

1. Cloudflare dashboard → Zero Trust → **Access** → Applications → Add an application → Self-hosted.
2. Application domain: `<your-app-host>` (e.g. `news.example.com`), path: `/api/admin/*` (single wildcard covers all admin endpoints, current and future). Include both `POST` and `GET` — Access gates the whole route.
3. Identity provider: any already-configured IdP that supports email assertion (Google, GitHub, One-Time PIN).
4. Access policy: **Include** → Emails → `<admin@example>` (replace with the operator's email). Session lifetime: 24h or shorter per operator preference.
5. Save. The Access edge now issues a `CF_Authorization` JWT cookie on successful auth; requests to the gated paths without it are redirected to the Access login page.

The pages containing these buttons (`/settings`, the dashboard footer) are **not** gated by Access — every authenticated user can render them. The buttons post to the gated endpoints, so a non-admin clicking one sees the Access login prompt rather than the action succeeding. This matches REQ-DISC-004 AC 5: the surface is shown, but execution is restricted.

The dev-bypass endpoint at `/api/dev/login` is gated separately by the `DEV_BYPASS_TOKEN` Worker secret (returns 404 when the secret is unset) and does **not** need a Cloudflare Access policy.

Keep the Cloudflare Access policy in sync with deploys so unauthorized clicks land on the login page rather than a bare 403. The Worker gate is the security boundary; Access tunes the UX around it.

### Dev-bypass runbook (integration only)

`/api/dev/login` is the operator escape hatch for driving admin endpoints from a script when the integration deploy has no Cloudflare Access in front of it (`news.novoselec.ch`). Production (`news.graymatter.ch`) leaves `DEV_BYPASS_TOKEN` unset; the runbook below applies only to integration.

**Two secrets, two failure modes the deploy creates:**

1. `DEV_BYPASS_TOKEN` — pushed by the deploy from the GitHub Actions secret. Past deploys have written an empty/encoded value due to CR/LF issues, leaving `/api/dev/login` returning 404 for a token that looks valid locally.
2. `DEV_BYPASS_USER_ID` — actively **deleted** by the deploy (idempotent). Prevents stale impersonation from outliving its window. Every deploy reverts dev-login to `__e2e__`, which does not match `ADMIN_EMAIL` — admin endpoints return 401/403 even with a valid session.

**After every integration deploy, re-stamp both secrets via the Cloudflare REST API.** Wrangler's `/memberships` preflight fails in this container (token has Workers Scripts edit but not Account Read) — go direct to the secrets endpoint instead:

<!-- doc-allow-element: AD46 dev-bypass-runbook secret re-stamp block -->
```bash
# From the operator's local env. ACCOUNT_ID lives in the
# `CLOUDFLARE_ACCOUNT_ID` GitHub Actions repo variable; export it from
# there or copy from the Cloudflare dashboard sidebar before running.
ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID"
WORKER=ai-news-digest-integration

# 1. Re-push DEV_BYPASS_TOKEN from the local source of truth (~/tmp/.bypass_token).
curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER/secrets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg v "$(cat /tmp/.bypass_token)" \
        '{name:"DEV_BYPASS_TOKEN",text:$v,type:"secret_text"}')"

# 2. Set DEV_BYPASS_USER_ID to the operator user_id (from D1 `users` table).
curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER/secrets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg v "$DEV_BYPASS_USER_ID" \
        '{name:"DEV_BYPASS_USER_ID",text:$v,type:"secret_text"}')"
# DEV_BYPASS_USER_ID is the operator's user_id from the D1 `users`
# table (lookup: SELECT id FROM users WHERE email = '<your-email>').
```

Both writes propagate at Cloudflare's secret-store cadence — re-run the `/api/dev/login` mint until it returns 200 rather than relying on a fixed wait. Then mint a session and drive any admin endpoint:

<!-- doc-allow-element: AD46 dev-bypass-runbook session-mint and admin-drive block -->
```bash
# Mint a session — Origin header is required (the route enforces same-origin POST).
curl -s -X POST "https://news.novoselec.ch/api/dev/login" \
  -H "Authorization: Bearer $(cat /tmp/.bypass_token)" \
  -H "Origin: https://news.novoselec.ch" \
  -c /tmp/cookies.txt -o /dev/null -w "%{http_code}\n"   # expect 200

# Drive any admin endpoint with the cookie + Origin + Accept: application/json.
curl -s -X POST "https://news.novoselec.ch/api/admin/embed-backfill" \
  -b /tmp/cookies.txt \
  -H "Origin: https://news.novoselec.ch" \
  -H "Accept: application/json"

# Kick a queue-driven historical-dedup sweep (no body = kicker mode); poll status by run_id.
RUN_ID=$(curl -s -X POST "https://news.novoselec.ch/api/admin/historical-dedup" \
  -b /tmp/cookies.txt \
  -H "Origin: https://news.novoselec.ch" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}' | jq -r '.run_id')

curl -s "https://news.novoselec.ch/api/admin/dedup-status?run_id=$RUN_ID" \
  -b /tmp/cookies.txt \
  -H "Origin: https://news.novoselec.ch" \
  -H "Accept: application/json" \
  | jq '{status, scanned, merged, remaining, done, failed, error}'

# Kick a full backend pipeline run (mode=full keeps embeddings; mode=wipe re-embeds first).
PIPE_ID=$(curl -s -X POST "https://news.novoselec.ch/api/admin/pipeline-run" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"mode":"full"}' | jq -r '.pipeline_run_id')

# Poll for live progress; omit ?id to recover the most recent run.
curl -s "https://news.novoselec.ch/api/admin/pipeline-status?id=$PIPE_ID" \
  -b /tmp/cookies.txt \
  -H "Accept: application/json" \
  | jq '{status, current_phase, done, failed, error}'
```

**Failure-mode quick-reference:**

| Symptom | Cause | Fix |
|---|---|---|
| `/api/dev/login` returns 404 | `DEV_BYPASS_TOKEN` empty/missing on the worker (deploy push truncated it) | Re-push via REST as above |
| `/api/dev/login` returns 200 but admin route returns 401/403 | `DEV_BYPASS_USER_ID` deleted by deploy → session is `__e2e__`, not admin | Set `DEV_BYPASS_USER_ID` via REST as above |
| `/api/dev/login` returns 403 with "Cross-site POST forbidden" | Missing `Origin: https://news.novoselec.ch` header | Add it; the route enforces same-origin POST |
| Session cookie present but admin still 401 | Session expired (5-minute access-token TTL) | Re-mint via `/api/dev/login` |

The token in `/tmp/.bypass_token` is the canonical local source of truth; treat the GitHub Actions `DEV_BYPASS_TOKEN` secret as derivative — re-push it from `/tmp/.bypass_token` when `/api/dev/login` returns 404 on integration despite a non-empty GitHub Actions secret (deploy push truncated the worker-side value).

## Resend domain verification

1. Log in to Resend dashboard.
2. Add the sending domain under "Domains".
3. Copy the DNS records (MX, TXT for SPF, DKIM CNAMEs, DMARC TXT) into your DNS provider.
4. Wait for verification — the Resend dashboard shows the domain row's status flip from `Pending` to `Verified` once DNS propagation completes.
5. Update the `RESEND_FROM` Worker secret to use an address on the verified domain.
6. Until verified, Resend's sandbox only delivers to the account owner's verified email; non-owner recipients receive nothing.

---

## Related Documentation

- [Configuration](configuration.md) — Env vars and secrets
- [Architecture](architecture.md) — System overview
- [Security Policy](../../SECURITY.md) — Vulnerability reporting scope and contact
