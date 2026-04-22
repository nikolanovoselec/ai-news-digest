# news-digest

A personalized daily tech news digest. Sign in with GitHub, pick your interests as hashtags, and get an AI-curated digest once per day at a time you choose. No feeds to manage — hashtags drive what gets scraped.

## How it works

1. **Sign in with GitHub** — account is created on first login
2. **Pick your interests** — tap hashtags from 20 defaults or type your own
3. **Set your digest time** — pick exact HH:MM in your timezone; one scheduled generation per day at that moment
4. **Read** — overview grid with one-line summaries, click any card for the full brief with source link
5. **Refresh on demand** — manual "refresh now" button any time

Every digest shows execution time, token count, and estimated cost, so you can see what the LLM actually did.

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 5 on Cloudflare Workers |
| Theme base | [AstroPaper](https://github.com/satnaing/astro-paper) (MIT, minimal reading surface) |
| Auth | Custom GitHub OAuth + HMAC-SHA256 session JWT (no auth library) |
| Database | Cloudflare D1 |
| Sessions | Stateless JWT in HttpOnly cookie |
| LLM | Workers AI (user-selectable model) |
| Scheduling | Daily Cron Trigger (00:00 UTC) + Cloudflare Queues with per-user delayed delivery |
| Styling | Tailwind CSS 4 |
| PWA | `@vite-pwa/astro` — manifest, service worker, install prompt |

## Content sources

No feed table, no OPML, no per-user feed management. For each hashtag the user has selected, four free query-able sources are hit in parallel at generation time:

| Source | Endpoint | Purpose |
|---|---|---|
| Google News RSS | `news.google.com/rss/search?q={tag}+when:1d` | General tech news coverage, last 24h |
| Hacker News (Algolia) | `hn.algolia.com/api/v1/search_by_date?query={tag}&tags=story` | Developer-focused stories |
| Reddit | `reddit.com/search.json?q={tag}&t=day&sort=top` | Community discussion signal |
| arXiv | `export.arxiv.org/api/query?search_query=all:{tag}` | Research papers (for AI/ML tags) |

Results are canonicalized and deduplicated (see URL canonicalization below), then a single LLM call ranks the top 10 across all hashtags and writes the one-line + longer summary for each. The LLM is also asked to return which hashtag(s) matched each article — stored on the article row and shown subtly in the card for transparency.

### URL canonicalization

Dedupe by resolved URL alone is insufficient (UTM params, mirrors, casing). Each source URL is canonicalized before the dedupe key is computed:

1. Follow redirects with `GET` + `Range: bytes=0-0` + 3s timeout (not `HEAD` — many CDNs reject or mis-redirect HEAD). Cache resolved URL in KV keyed by source URL with 24h TTL.
2. Strip known tracking params: `utm_*`, `ref`, `ref_src`, `fbclid`, `gclid`, `mc_cid`, `mc_eid`, `igshid`, `si`, `source`.
3. Lowercase scheme and host, drop trailing slash on pathname.
4. Dedupe primarily by canonical URL; secondary dedupe by `sha256(host + pathname)` to catch mirrors.

## Default hashtag proposals

Shown as toggleable chips in both `/onboarding` and `/settings`. User may select any subset and add custom hashtags.

```
#cloudflare  #agenticai  #mcp         #aws            #aigateway
#llm         #ragsystems #vectordb    #workersai      #durableobjects
#typescript  #rust       #webassembly #edgecompute    #postgres
#openai      #anthropic  #opensource  #devtools       #observability
```

### Hashtag input rules

- Allowed characters: `a-z`, `0-9`, `-` (hyphen). Everything else is stripped on submit.
- Normalization: lowercase, strip leading `#` (optional when typing, never stored).
- Min length 2, max length 32 per tag.
- Max 20 tags per user (enforced server-side).
- Deduped before storage.

## Model selection

The settings page renders a dropdown populated from the Cloudflare API:

```
GET https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/models/search?task=Text+Generation
```

The result is cached in KV for one hour. The dropdown displays each model's name and description; the selected model ID is stored on the user row. The model used for each digest is also stored on the digest row, so the history view shows which model produced each result.

**Default**: `@cf/meta/llama-3.1-8b-instruct-fast`.

**Cache invalidation**: the KV entry has a 1h TTL and is keyed by account id. If the server-side fetch fails (non-200, timeout, malformed response), we do NOT overwrite the cached value — the previous good list is served for up to 24h with a stale flag surfaced to the server log. A stale cache is preferable to an empty dropdown.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page with "Sign in with GitHub" |
| `/onboarding` | First-run configuration: hashtags, digest time, model. Only reachable before first digest is set up. |
| `/settings` | Same form as onboarding, edit-mode. Also hosts logout, account deletion, install-app prompt |
| `/digest` | Today's digest — card grid with one-line summaries, matched hashtags shown subtly on each card, "Refresh now" button, execution/cost footer |
| `/digest/:id/:slug` | Article detail — longer summary with critical points, matched hashtags, source link |
| `/history` | Past digests paginated 20 per page, each with its own execution/cost metrics |

## Design system

Swiss-minimal aesthetic. Generous whitespace, restricted palette, no gradients, no drop shadows, one accent color. Content is the UI — chrome fades away.

- **Typography**: system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif`). Five sizes only: `12, 14, 16, 20, 32px`. Two weights: 400 (body) and 600 (headings, labels).
- **Palette**: neutral grays + one accent. Defined as CSS custom properties on `:root` and `[data-theme="dark"]`. Tokens: `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--accent`.
- **Light theme**: `--bg: #ffffff`, `--surface: #fafafa`, `--text: #111111`, `--text-muted: #666666`, `--border: #e5e5e5`, `--accent: #0066ff`.
- **Dark theme**: `--bg: #0a0a0a`, `--surface: #141414`, `--text: #f5f5f5`, `--text-muted: #999999`, `--border: #262626`, `--accent: #4d94ff`.
- **Base font size**: 16px on all inputs to prevent iOS zoom-on-focus.
- **Reduced motion**: all transitions wrapped in `@media (prefers-reduced-motion: no-preference)`.
- **Accessibility**: WCAG 2.1 AA floor. Full keyboard navigation, visible focus rings, semantic landmarks, skip-to-content link.

### Dark mode toggle

Single button in the header (sun icon in light, moon in dark). One click toggles the `data-theme` attribute on `<html>` and persists to `localStorage.theme`. Default follows `prefers-color-scheme`.

**No flash of wrong theme**: a tiny inline `<script>` is injected as the **first child of `<head>`**, before any CSS link. It reads `localStorage.theme` (falling back to `matchMedia('(prefers-color-scheme: dark)')`) and sets `document.documentElement.dataset.theme` synchronously. Because it runs before stylesheets resolve, the correct theme is applied in the same render tick — no FOUC.

## PWA & offline

Installable on iOS, Android, and desktop. Offline-readable for the last viewed digest.

### Manifest (`/manifest.webmanifest`)

```json
{
  "name": "News Digest",
  "short_name": "Digest",
  "description": "Your daily AI-curated tech news digest",
  "start_url": "/digest",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`theme_color` is updated live via JavaScript when the user toggles dark mode so the OS chrome matches.

### Service worker

Provided by `@vite-pwa/astro` (Workbox under the hood). Caching strategies:

| Asset type | Strategy |
|---|---|
| Static (JS, CSS, fonts, icons) | Cache-first, hashed filenames |
| `/digest/*` HTML | Stale-while-revalidate |
| `/api/*` | Network-first, 3s timeout, fall back to cache |
| `/manifest.webmanifest`, `/icons/*` | Cache-first |

The last viewed digest and its article detail pages remain readable offline. `/settings` and the refresh button show an "offline" banner when `navigator.onLine === false`.

**Logout cache clear**: the logout handler posts a message to the service worker (`{ type: 'CLEAR_USER_CACHE' }`); the SW deletes the digest/article caches before the redirect completes. This prevents a subsequent user on the same device from seeing the previous user's cached digest.

### iOS / Apple meta tags

In the root layout:

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Digest">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
```

### Install prompt

- **Android / desktop Chrome**: listen for `beforeinstallprompt`, stash the event, surface an "Install app" button in the header of `/settings`. Dismissible; not shown again for 30 days if dismissed.
- **iOS Safari**: no programmatic prompt — surface a one-time instructional tooltip ("Tap the share icon, then Add to Home Screen") detected via `/iPad|iPhone|iPod/.test(navigator.userAgent)` and `!navigator.standalone`.

## Mobile & responsive

Mobile-first layout. Looks native on iOS, Android, and desktop without compromise.

- **Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` on every page.
- **Breakpoints**: base (<640px) single-column, `md` (≥768px) two-column digest grid, `lg` (≥1024px) three-column grid with sidebar.
- **Safe-area insets**: sticky header and bottom nav use `padding-top: env(safe-area-inset-top)` / `padding-bottom: env(safe-area-inset-bottom)` for iPhone notches and Android gesture bars.
- **Touch targets**: minimum 44x44px (iOS HIG) / 48x48dp (Android Material) on all interactive elements.
- **Navigation**:
  - Mobile: bottom tab bar (Digest, History, Settings) with safe-area padding. Header shows logo + dark-mode toggle only.
  - Desktop: left sidebar with same three entries plus logout at the bottom.
- **Pull-to-refresh**: native browser behavior on `/digest` (mobile). The "Refresh now" button handles desktop.
- **Input zoom prevention**: all `<input>` and `<textarea>` have `font-size: 16px` minimum on iOS.
- **Tap highlights**: disabled via `-webkit-tap-highlight-color: transparent`; focus and active states handled by CSS.
- **Haptic feedback**: on the refresh button and theme toggle via `navigator.vibrate(10)` where supported (Android); iOS ignores gracefully.

## Onboarding flow

First-run experience after a brand-new user signs in with GitHub.

```
1. GitHub OAuth callback creates the users row (github_id, email, tz) — tz is
   captured from the browser via Intl.DateTimeFormat().resolvedOptions().timeZone
   and posted to the callback as a query param from the landing page.
2. Callback checks if hashtags IS NULL OR digest_hour IS NULL.
   - Yes  → redirect to /onboarding
   - No   → redirect to /digest
3. /onboarding is a single-page form with three inline sections:
   a. Interests — 20 default hashtag chips, custom text input, min 1 required
   b. Schedule — HH:MM time picker (native <input type="time">) for the
      exact local time the digest should run. Timezone shown with a link
      "detected Europe/Zurich — change" that opens a dropdown of IANA zones.
   c. Model — Workers AI model dropdown, default pre-selected, collapsible
      "Advanced" disclosure hides this by default.
4. Submit button: "Generate my first digest".
5. On submit: UPDATE users SET hashtags_json, digest_hour, digest_minute,
   tz, model_id. Trigger the digest pipeline immediately (out-of-band,
   not at the scheduled time) and redirect to /digest with a loading state
   while generation runs.
```

### Middleware gating

Every authenticated request checks: if `hashtags_json IS NULL OR digest_hour IS NULL` AND path is not `/onboarding` or an auth route → redirect to `/onboarding`. Once both are set, visiting `/onboarding` redirects to `/settings`. Gating is based on "settings incomplete", not "first digest not yet generated" — a user whose first digest fails is not trapped in onboarding.

### Timezone handling

Captured at first login from the browser via `Intl.DateTimeFormat().resolvedOptions().timeZone` and stored on the users row. Editable in `/settings` (dropdown of common IANA zones + search), because users travel and the app should not require re-login to adjust. On every authenticated page load, the browser's current tz is compared to the stored value; if they differ, a one-time non-blocking banner offers "Detected Europe/Paris — update your setting?".

All scheduling math uses the stored tz via `Intl.DateTimeFormat` with the `timeZone` option (part of the Workers runtime, no external library needed). DST is handled by computing the next wall-clock hour in the user's tz and converting to UTC via `Intl`.

## Data model (D1)

Identity model: `users.id` IS the GitHub numeric id (as TEXT). There is no separate UUID. The JWT `sub` claim is the same value, so every query path uses one key. This eliminates the footgun where `sub` and `id` could drift.

Foreign keys are declared with `ON DELETE CASCADE`. D1 requires `PRAGMA foreign_keys=ON` to enforce them; this pragma is set on every connection.

```sql
PRAGMA foreign_keys = ON;

-- users.id == GitHub numeric id, stored as TEXT. Single source of identity.
CREATE TABLE users (
  id                          TEXT PRIMARY KEY,
  email                       TEXT NOT NULL,
  gh_login                    TEXT NOT NULL,
  tz                          TEXT NOT NULL,          -- IANA timezone
  digest_hour                 INTEGER,                -- 0-23 local time
  digest_minute               INTEGER NOT NULL DEFAULT 0,  -- 0-59 local time
  hashtags_json               TEXT,                   -- JSON array of strings
  model_id                    TEXT,                   -- Workers AI model id
  next_due_at                 INTEGER,                -- unix ts, for cron scan
  last_generated_local_date   TEXT,                   -- YYYY-MM-DD in user tz; dedup key for scheduled runs
  last_refresh_at             INTEGER,                -- unix ts of most recent manual refresh
  refresh_window_start        INTEGER,                -- start of current rolling 24h window
  refresh_count_24h           INTEGER NOT NULL DEFAULT 0,
  created_at                  INTEGER NOT NULL
);
CREATE INDEX idx_users_next_due ON users(next_due_at);

CREATE TABLE digests (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at          INTEGER NOT NULL,
  execution_ms          INTEGER,
  tokens_in             INTEGER,                      -- nullable: model may not return counts
  tokens_out            INTEGER,
  input_price_per_mtok  REAL,                         -- price snapshot at generation time
  output_price_per_mtok REAL,
  price_source_ts       INTEGER,                      -- unix ts when price was fetched
  model_id              TEXT NOT NULL,
  status                TEXT NOT NULL,                -- pending | in_progress | ready | failed
  error_code            TEXT,                         -- NULL unless status=failed
  error_message         TEXT,
  retry_count           INTEGER NOT NULL DEFAULT 0,
  locked_at             INTEGER,                      -- optimistic lock: NULL when free, ts when claimed
  lock_owner            TEXT,                         -- job id or queue message id
  trigger               TEXT NOT NULL                 -- 'scheduled' | 'manual'
);
CREATE INDEX idx_digests_user_generated ON digests(user_id, generated_at DESC);
CREATE INDEX idx_digests_status_lock ON digests(status, locked_at);

CREATE TABLE articles (
  id              TEXT PRIMARY KEY,
  digest_id       TEXT NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  source_url      TEXT NOT NULL,                      -- canonical, post-resolution URL
  canonical_hash  TEXT NOT NULL,                      -- sha256(host + pathname), secondary dedupe key
  title           TEXT NOT NULL,
  one_liner       TEXT NOT NULL,                      -- <=120 chars
  detail_md       TEXT NOT NULL,                      -- longer summary, markdown
  matched_tags    TEXT,                               -- JSON array of hashtags that matched
  source_name     TEXT,                               -- 'Google News' | 'Hacker News' | 'Reddit' | 'arXiv'
  published_at    INTEGER,
  rank            INTEGER NOT NULL
);
CREATE INDEX idx_articles_digest_rank ON articles(digest_id, rank);

-- Resolved URL cache (also mirrored in KV for read performance, D1 is the source of truth)
CREATE TABLE resolved_urls (
  source_url      TEXT PRIMARY KEY,
  canonical_url   TEXT NOT NULL,
  resolved_at     INTEGER NOT NULL
);
CREATE INDEX idx_resolved_urls_ts ON resolved_urls(resolved_at);

-- no sessions table: sessions are stateless JWTs in HttpOnly cookies
```

### Migrations

Schema evolution managed via `wrangler d1 migrations`. Migration files live in `migrations/NNNN_description.sql` and are applied with `wrangler d1 migrations apply DB_NAME`. The initial schema above is `0001_initial.sql`.

## Authentication

Custom implementation, no third-party auth library. Pattern lifted from the codeflare repo — proven, ~250 lines of TypeScript, zero ORM or dependency churn.

### Flow

```
/api/auth/github/login
  1. Generate random UUID for CSRF state
  2. Set oauth_state cookie (HttpOnly, Secure, SameSite=Lax, 5 min TTL)
  3. Redirect to github.com/login/oauth/authorize with client_id, redirect_uri,
     scope=user:email, state

/api/auth/github/callback
  1. Validate state cookie === state query param (reject 403 if mismatch)
  2. Clear oauth_state cookie
  3. POST code to github.com/login/oauth/access_token → access token
  4. GET api.github.com/user and /user/emails in parallel → extract primary
     verified email, numeric id (stringified), login
  5. INSERT OR IGNORE into users (id, email, gh_login, tz, created_at).
     users.id IS the GitHub numeric id as TEXT — no separate UUID.
     tz comes from a query param posted by /, captured via Intl API.
  6. Sign HMAC-SHA256 JWT with { sub: users.id, email, gh_login, iat, exp }.
     sub and users.id are the same value — single identity key, no drift.
  7. Set __Host-news_digest_session cookie (HttpOnly, Secure, SameSite=Lax,
     Path=/, no Domain attribute, 1h TTL)
  8. Redirect to /onboarding (if hashtags_json or digest_hour null) else /digest

/api/auth/github/logout
  1. Clear __Host-news_digest_session cookie (Max-Age=0)
  2. postMessage to any open service worker: clearCacheForUser()
  3. Redirect to /
```

### Cookie hardening

- Cookie name uses the **`__Host-` prefix** — browser enforces `Secure`, `Path=/`, and no `Domain` attribute. This blocks entire classes of cookie-injection attacks (e.g., a subdomain setting a cookie that shadows ours).
- Full attribute set: `__Host-news_digest_session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`.
- `SameSite=Lax` (not `Strict`) because we need the cookie to accompany the redirect back from GitHub OAuth.

### CSRF protection for state-changing endpoints

`SameSite=Lax` blocks cross-origin form submits but NOT same-origin XHR or fetch. Every `POST/PUT/PATCH/DELETE` handler enforces:

1. **Origin check**: reject if `Origin` header is missing or not equal to the app's canonical origin. Workers sees `Origin` on every non-GET fetch from browsers.
2. **Double-submit CSRF token**: on any authenticated GET that renders a form or API-calling page, set a `csrf_token` cookie (non-HttpOnly, SameSite=Lax, 1h) with a random value. Client-side code reads it and echoes it in an `X-CSRF-Token` header on every unsafe request. Server rejects if the header is missing or does not match the cookie.

Both checks must pass. Origin check alone catches most automated CSRF; the double-submit token catches everything else including any future cross-origin fetch bugs.

### Session validation

Every protected Astro route and API endpoint calls a shared helper that reads `__Host-news_digest_session`, verifies the HMAC signature with `OAUTH_JWT_SECRET`, checks `exp`, and loads the user row from D1 via `users.id = jwt.sub`. Unauthenticated requests redirect to `/`.

### Session auto-refresh

A middleware runs on every response. If the JWT has less than 15 minutes remaining, it issues a fresh 1-hour JWT and updates the cookie. Users stay signed in as long as they visit at least once per hour.

### OAuth error contract

Failures redirect to `/?error={code}` with one of these allowlisted codes; the landing page renders a human-readable message based on the code.

| Code | Meaning |
|---|---|
| `access_denied` | User clicked "Cancel" on GitHub's consent screen |
| `no_verified_email` | User has no primary + verified email on GitHub |
| `invalid_state` | CSRF state mismatch (possible forgery or expired flow) |
| `oauth_error` | Any other GitHub error — details logged server-side, user sees generic message |

### Account deletion

`/settings` has a "Delete account" button (confirmation dialog required). Endpoint `DELETE /api/auth/account` deletes the users row and cascades to all digests and articles. Session cookie is cleared, user is redirected to `/` with a one-time confirmation banner.

### Secrets

Deployed via `wrangler secret put`:

| Secret | Purpose |
|---|---|
| `OAUTH_CLIENT_ID` | GitHub OAuth App client ID |
| `OAUTH_CLIENT_SECRET` | GitHub OAuth App client secret |
| `OAUTH_JWT_SECRET` | Random 32+ char string for HMAC signing |
| `CLOUDFLARE_API_TOKEN` | For the Workers AI models catalog lookup |

### Why no auth library

- Single provider (GitHub), no passwords, no 2FA, no passkeys, no teams — library features we'd never use
- Stateless JWT + 1h TTL means a stolen token dies quickly even without a revocation list
- No ORM dependency pulled in by Better Auth / Auth.js adapters
- If scope later demands multi-provider, passkeys, or session management UI, a one-day migration to Better Auth is bounded — not worth paying that cost up front

## Generation pipeline

Architecture: dispatcher + consumer, connected by Cloudflare Queues. The dispatcher runs once per day; the consumer processes jobs as they become due. This pattern keeps each Worker invocation short, avoids CPU/wall-time limits, and gives us retries + dead-letter handling for free.

### Dispatcher (daily cron at 00:00 UTC)

```
1. Single Cron Trigger fires at 00:00 UTC.
2. SELECT id, tz, digest_hour, digest_minute FROM users
   WHERE hashtags_json IS NOT NULL AND digest_hour IS NOT NULL.
3. For each user:
   a. Compute delay_seconds = seconds until next occurrence of
      digest_hour:digest_minute in user's tz (handles DST, wraps to
      tomorrow if that wall-clock time has already passed today).
   b. Enqueue job { user_id, trigger: 'scheduled', local_date: YYYY-MM-DD }
      to the 'digest-jobs' Queue with delaySeconds = delay_seconds.
4. Done — this run touches D1 only for the user list, fans out to Queues.
```

No 15-min polling. Each user gets exactly one scheduled job per day, delivered at their local hour.

### Consumer (Queue handler)

```
For each message:
1. Claim the digest row: INSERT or UPDATE digests SET status='in_progress',
   locked_at=now(), lock_owner=messageId
   WHERE user_id=? AND (status IN ('pending','failed') OR locked_at IS NULL
                         OR locked_at < now()-900)
   -- 15-min lock TTL prevents stuck locks from blocking forever.
2. Idempotency check: if message.trigger='scheduled' AND
   users.last_generated_local_date == message.local_date → ack and exit
   (duplicate delivery, already done).
3. For each hashtag in users.hashtags_json, fan out 4 queries in parallel
   (Google News, HN, Reddit, arXiv) with per-source concurrency cap of 4
   and 5s timeout each.
4. Canonicalize and dedupe URLs (see URL canonicalization section).
5. Single Workers AI call with users.model_id:
   "User cares about [hashtags]. From these N headlines, pick top 10.
    For each: { title, url, one_liner (<=120 chars), detail (markdown,
    3 bullets covering critical points), matched_tags (array of which
    user hashtags this article relates to) }."
6. If LLM call fails: retry once with a shorter prompt (top 50 headlines
   instead of all). If still fails: mark digest status='failed' with
   error_code, error_message. Queue retry policy handles bounded re-delivery.
7. Capture execution_ms, tokens_in, tokens_out (from Workers AI response;
   if absent, mark as estimated in the UI). Snapshot model price.
8. INSERT articles rows. UPDATE digests SET status='ready', clear lock.
9. For 'scheduled' trigger: UPDATE users SET last_generated_local_date=?
   (idempotency key for tomorrow's run).
10. Acknowledge queue message.
```

### Manual refresh

Triggered from the UI "Refresh now" button. Enqueues a `{ trigger: 'manual' }` job to the same queue with no delay.

**Rate limits** (enforced at the `POST /api/digest/refresh` endpoint before enqueue):

```
- 5-minute cooldown: reject if now() - last_refresh_at < 300.
- 10/24h cap: if now() > refresh_window_start + 86400, reset window and
  refresh_count_24h=0. If refresh_count_24h >= 10, reject.
- On accept: UPDATE users SET last_refresh_at=now(),
  refresh_count_24h=refresh_count_24h+1 (with window reset as above).
```

### Rate-limit UX

When rejected, the API returns `429` with a JSON body `{ error, retry_after_seconds, reason }`. The UI shows a non-blocking toast: "You've hit today's refresh limit — try again in 4h 12m" or "Hold on — you can refresh again in 2:30". The refresh button disables with a live countdown until the cooldown expires.

### Retry strategy

- **Per-source fetch failures** (Google News, HN, Reddit, arXiv): 1 retry with 500ms + jitter backoff. If a source fails both attempts, the digest proceeds with whatever sources succeeded. All four failing → digest status='failed' with error_code='all_sources_failed'.
- **LLM failures**: 1 retry with shorter prompt. Second failure → digest status='failed' with error_code='llm_failed'.
- **Queue delivery failures**: Cloudflare Queues default retry (up to 3 attempts) + dead-letter queue `digest-jobs-dlq` for manual inspection.

### Empty and loading states

- **Brand-new user** (never had a digest): `/digest` shows a centered "Generating your first digest…" block with a cascading skeleton grid, then swaps to real cards when ready.
- **Generation in progress** (manual refresh): refresh button morphs into an indeterminate progress bar; existing cards dim to 60% opacity and a subtle shimmer runs across them. On completion, new cards fade in while old ones fade out.
- **All sources returned nothing**: "No matching stories today — try broader hashtags" with a link to `/settings`.
- **LLM or source failure**: digest row marked `status='failed'`, UI shows "Something went wrong generating your digest" with a retry button that re-triggers the pipeline.
- **Offline**: banner at top of page; refresh button disabled with a tooltip "You're offline".

## Cost and time transparency

Every digest view renders a footer like:

```
Generated 07:59 CET  ·  2.4s  ·  3,847 tokens  ·  ~$0.0012  ·  llama-3.1-8b-instruct-fast
```

Values come from the `execution_ms`, `tokens_in + tokens_out`, and `model_id` columns on the digest row. Cost is computed from the model's published per-token price.

## Motion & polish

High-class polish is part of the MVP, not a later pass. Every transition has a purpose — orient the user, mask latency, or reward an action. All motion respects `prefers-reduced-motion: reduce` and collapses to instant state changes.

### Foundations

- **Easing**: one curve everywhere, `cubic-bezier(0.22, 1, 0.36, 1)` (sharp start, soft finish). Durations: 150ms (micro), 250ms (component), 400ms (page).
- **Astro View Transitions API**: enabled globally. Route changes cross-fade by default; specific elements use `transition:name` for shared-element morphs (digest card → article detail view).
- **No motion library**: pure CSS + Astro's built-in transitions. If a specific interaction needs more (spring physics, FLIP), add `motion` (Motion One, ~3KB) — not Framer Motion.

### Cascading content reveals

- **Digest grid entrance**: each card fades in + rises 8px, staggered by 40ms (`animation-delay: calc(var(--i) * 40ms)`). Stops at 10 cards so the last one lands within 400ms.
- **Article detail**: title, then summary paragraph, then bullet list, each staggered 80ms. Source link draws in last with a subtle underline-expand.
- **History list**: rows stagger-fade at 30ms intervals.
- **Settings form**: each section (interests, schedule, model) slides up 12px with 100ms stagger on first paint.

### Skeleton loaders (LLM generation)

- **Card skeletons** match real card dimensions exactly so there's no layout shift. Shimmer runs as a 1.4s linear-gradient sweep (disabled under reduced-motion).
- **Token counter**: during generation, the footer shows a ticking tokens-in estimate that counts up in real-time (animated via `requestAnimationFrame`), then snaps to the final value when the call returns.
- **Progress choreography** on manual refresh: button → progress bar → checkmark draw on success (SVG stroke-dasharray animation) → bar fades out.

### Micro-interactions

- **Buttons**: `transform: scale(0.97)` on `:active`, 100ms. Haptic tap (Android) on primary actions.
- **Hashtag chips**: selecting scales from 1 → 1.1 → 1, with accent color fill sweeping in from left to right (150ms).
- **Theme toggle**: uses the View Transitions API to do a circular wipe from the toggle button's position — the new theme reveals as a growing circle. Falls back to instant swap on unsupported browsers.
- **Cost/token numbers** on the digest footer: count-up animation from 0 over 600ms when the card enters view (IntersectionObserver-triggered).
- **Card hover (desktop)**: lift 2px + border shifts to accent color, 200ms. No shadow change (stays flat).
- **Link underlines**: animate stroke from 0 to 100% width on hover, 200ms.

### Onboarding choreography

- **Step entrance**: each of the three sections (Interests → Schedule → Model) fades in sequentially as the user scrolls or completes the prior step. A subtle left-side rail visualizes progress.
- **Hashtag chip burst**: when the user taps a chip, it pops (scale 1 → 1.15 → 1) and a thin accent-colored particle (a single dot) drifts up-and-out over 400ms before fading. Celebratory but not distracting.
- **Timezone detection reveal**: "Detected: Europe/Zurich" types in character-by-character (20ms per char) when the section appears, reinforcing that the system noticed something specific about the user.
- **Submit button transformation**: on click, "Generate my first digest" collapses into a progress bar that fills as the first digest generates, then morphs into a checkmark that expands to fill the screen before the route transitions to `/digest`.

### Page transitions

- **Landing → OAuth**: button expands and fades to white as the redirect fires, giving a sense of "handing off".
- **OAuth callback → Onboarding**: soft fade-in with the first onboarding section sliding up from below.
- **Onboarding → Digest**: curtain wipe from top (400ms) then the first-digest loading state appears.
- **Digest card → Article detail**: shared-element morph — the card expands into the detail view's hero block using View Transitions' `transition:name`. Back button reverses it.
- **Route failures**: if a route throws, the app shows a full-screen fade to a minimal error state with a "return home" action.

## What is explicitly out of scope for MVP

- Email delivery (read in-app only)
- Multiple digests per day
- Slack, Telegram, or RSS output
- OPML import, user-added feeds
- Sharing, bookmarking, cross-user recommendations
- Embeddings or vector search (single LLM call handles ranking)
- R2 archive of digest HTML (D1 stores markdown directly; digests are small)

These may be revisited after v1 ships.

## Security headers

Every response includes these headers, set by a Cloudflare Worker response middleware:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.github.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://github.com` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (also covered by CSP `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `interest-cohort=(), geolocation=(), microphone=(), camera=()` |

`'unsafe-inline'` is present for the theme-init inline script and for CSS-in-Astro. A future pass can move to a CSP nonce if stricter isolation is needed.

## Observability

Structured JSON logs via `console.log(JSON.stringify(...))` so Cloudflare's Logs surface them as queryable fields. Every log line includes `ts`, `level`, `event`, `user_id` (if applicable), and event-specific fields.

Events logged:

| Event | Fields |
|---|---|
| `auth.login.success` | `user_id`, `gh_login`, `new_user` (bool) |
| `auth.login.failed` | `error_code` (from OAuth error contract) |
| `digest.scheduled.enqueued` | `user_id`, `delay_seconds`, `local_date` |
| `digest.generation.started` | `user_id`, `digest_id`, `trigger`, `hashtag_count` |
| `digest.generation.completed` | `user_id`, `digest_id`, `execution_ms`, `tokens_in`, `tokens_out`, `article_count` |
| `digest.generation.failed` | `user_id`, `digest_id`, `error_code`, `error_message`, `retry_count` |
| `source.fetch.failed` | `source_name`, `hashtag`, `http_status`, `error` |
| `source.fetch.ratelimited` | `source_name`, `retry_after` |
| `refresh.rejected` | `user_id`, `reason` (`cooldown`\|`daily_cap`), `retry_after_seconds` |
| `llm.call.failed` | `user_id`, `model_id`, `error`, `retry_count` |

Cloudflare Analytics Engine is used for numeric aggregates (daily digest count, failure rate, p95 generation time) via `env.ANALYTICS.writeDataPoint` — cheap and queryable. Logpush to R2 is reserved for v2.

## History pagination

`/history` renders 20 digests per page, newest first. D1 query: `SELECT ... FROM digests WHERE user_id=? ORDER BY generated_at DESC LIMIT 20 OFFSET ?`. Pagination is cursor-based via `?before=<unix_ts>` in the URL (not offset-based) so inserts during paging don't cause duplicates. The "load more" button fetches the next 20 via `fetch` and appends with a staggered fade-in.

## Deployment

Cloudflare Workers. Daily Cron Trigger configured in `wrangler.toml` (`crons = ["0 0 * * *"]`). D1, KV (model catalog only), and Queues (`digest-jobs` + `digest-jobs-dlq`) bindings provisioned via `wrangler`. GitHub OAuth client ID/secret, `OAUTH_JWT_SECRET`, and Cloudflare API token configured as Worker secrets. Schema migrations applied with `wrangler d1 migrations apply`.
