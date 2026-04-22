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

### URL canonicalization and SSRF protection

Each source URL is canonicalized before the dedupe key is computed. Before following any redirect, the URL is validated to prevent SSRF:

1. **URL validation** (applied to source URL AND every intermediate redirect target):
   - Scheme must be `https:` (reject `http:`, `file:`, `ftp:`, custom schemes).
   - Parse hostname; reject if it contains `@` (user-info) or is an IP literal in RFC 1918 (10/8, 172.16/12, 192.168/16), RFC 5737 test ranges, loopback (127/8, ::1), link-local (169.254/16, fe80::/10), Cloudflare internal (100.64.0.0/10), or is `localhost`/`metadata.*`.
   - Resolve hostname via `fetch` with `redirect: 'manual'` — the Workers runtime does the DNS; we inspect the final IP by checking the redirect `Location` header chain, re-validating at each hop.
2. **Resolution**: GET with `Range: bytes=0-0`, `redirect: 'follow'`, 3s timeout, max 3 redirects. HEAD is NOT used — many CDNs mis-handle it.
3. **Cache**: resolved URL stored in KV keyed by source URL with 24h TTL. KV only (no D1 mirror).
4. **Canonicalization**: strip tracking params (`utm_*`, `ref`, `ref_src`, `fbclid`, `gclid`, `mc_cid`, `mc_eid`, `igshid`, `si`, `source`), lowercase scheme and host, drop trailing slash on pathname.
5. **Dedupe** by canonical URL string. A secondary hash was previously specified but dropped as over-engineering — duplicates across mirror domains are acceptable in a daily digest.

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

**Validation on write**: the `model_id` submitted by the client is validated against the KV catalog before storage. If the submitted value is not present in the cache, reject with 400. If the cache is empty (cold start failure), reject with 503 — never store an unvalidated value. The KV entry uses a 1h TTL; on cache miss, fetch the catalog fresh.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page with "Sign in with GitHub" |
| `/settings` | Unified onboarding + settings. On `?first_run=1`, shows a "Welcome — let's set up your first digest" hero and the submit button reads "Generate my first digest". Once `hashtags_json` and `digest_hour` are set, `?first_run=1` is ignored and normal edit-mode renders (with logout, account deletion, install-app prompt) |
| `/digest` | Today's digest — card grid with one-line summaries, "Refresh now" button, execution/cost footer |
| `/digest/:id/:slug` | Article detail — longer summary with critical points and source link |
| `/history` | Past digests, newest first, 30 per page with a simple "Load more" button |

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

- **Android / desktop Chrome**: listen for `beforeinstallprompt`, stash the event, show an "Install app" button on `/settings`. OS handles repeat-prompt suppression; no per-user state tracking.
- **iOS Safari**: no programmatic prompt available — show a one-time instructional note ("Tap the share icon, then Add to Home Screen") when the app loads on iOS in a non-standalone context.

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

No dedicated `/onboarding` route. `/settings` IS the onboarding — the same form component renders in "first-run" or "edit" mode based on whether the user has completed initial setup.

```
1. GitHub OAuth callback creates the users row (id, email, gh_login, tz='UTC'
   placeholder, session_version=1).
2. Callback redirects to:
   - /settings?first_run=1 if hashtags_json IS NULL OR digest_hour IS NULL
   - /digest otherwise
3. On /settings page load:
   - If first_run=1 AND settings incomplete → render "Welcome" hero +
     "Generate my first digest" CTA
   - Otherwise render edit-mode with "Save" CTA + logout/delete/install
4. Client posts tz to /api/auth/set-tz on load (validated server-side against
   Intl.supportedValuesOf('timeZone')).
5. Form sections (rendered identically in both modes):
   a. Interests — 20 default hashtag chips, custom text input, min 1 required
   b. Schedule — HH:MM time picker (native <input type="time">). Timezone
      shown with a link "detected Europe/Zurich — change" that opens an
      IANA zone dropdown.
   c. Model — Workers AI model dropdown (validated against KV catalog on
      submit), default pre-selected, collapsible "Advanced" disclosure.
6. On submit: server validates every field (tz in IANA list, model_id in
   cached catalog, hashtags against regex). UPDATE users. For first-run,
   trigger the digest pipeline immediately (out-of-band) and redirect to
   /digest with a loading state. For edit-mode, flash "Saved" and stay.
```

### Middleware gating

Every authenticated request checks: if `hashtags_json IS NULL OR digest_hour IS NULL` AND path is not `/settings` or an auth route → redirect to `/settings?first_run=1`. Gating is based on "settings incomplete", not "first digest not yet generated" — a user whose first digest fails is not trapped.

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
  tz                          TEXT NOT NULL,          -- IANA timezone (validated on write)
  digest_hour                 INTEGER,                -- 0-23 local time
  digest_minute               INTEGER NOT NULL DEFAULT 0,  -- 0-59 local time
  hashtags_json               TEXT,                   -- JSON array of strings
  model_id                    TEXT,                   -- Workers AI model id (validated against catalog)
  next_due_at                 INTEGER,                -- unix ts, for cron scan
  last_generated_local_date   TEXT,                   -- YYYY-MM-DD in user tz; dedup key for scheduled runs
  last_refresh_at             INTEGER,                -- unix ts of most recent manual refresh
  refresh_window_start        INTEGER,                -- start of current rolling 24h window
  refresh_count_24h           INTEGER NOT NULL DEFAULT 0,
  session_version             INTEGER NOT NULL DEFAULT 1,  -- bumped on logout/delete to revoke outstanding JWTs
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
  estimated_cost_usd    REAL,                         -- computed at insert from a constants file mapping model_id -> per-Mtok prices
  model_id              TEXT NOT NULL,
  status                TEXT NOT NULL,                -- pending | in_progress | ready | failed
  error_code            TEXT,                         -- sanitized code only (see error handling)
  locked_at             INTEGER,                      -- optimistic lock: NULL when free, unix ts when claimed
  trigger               TEXT NOT NULL                 -- 'scheduled' | 'manual'
);
CREATE INDEX idx_digests_user_generated ON digests(user_id, generated_at DESC);
CREATE INDEX idx_digests_status_lock ON digests(status, locked_at);

CREATE TABLE articles (
  id              TEXT PRIMARY KEY,
  digest_id       TEXT NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  source_url      TEXT NOT NULL,                      -- canonical, post-resolution URL
  title           TEXT NOT NULL,
  one_liner       TEXT NOT NULL,                      -- <=120 chars, sanitized
  detail_md       TEXT NOT NULL,                      -- longer summary, markdown, sanitized before storage
  source_name     TEXT,                               -- 'Google News' | 'Hacker News' | 'Reddit' | 'arXiv'
  published_at    INTEGER,
  rank            INTEGER NOT NULL,
  read_at         INTEGER                             -- unix ts when user first opened the detail view; NULL if unread
);
CREATE INDEX idx_articles_digest_rank ON articles(digest_id, rank);
CREATE INDEX idx_articles_read ON articles(digest_id, read_at);  -- supports "articles read" stats

-- Resolved URL cache lives in KV only (key: source_url, value: canonical_url, TTL 24h).
-- No D1 mirror: KV is sufficient and one source of truth is simpler.
-- no sessions table: sessions are stateless JWTs in HttpOnly cookies
```

**Query discipline**: every query against `digests` and `articles` MUST include `AND user_id = :session_user_id` (or a JOIN that enforces it via `digests.user_id`). This is the only defense against IDOR if a future change introduces a query path that forgets it. Code review must flag any query touching these tables that doesn't scope by user_id.

### Migrations

Schema evolution managed via `wrangler d1 migrations`. Migration files live in `migrations/NNNN_description.sql` and are applied with `wrangler d1 migrations apply DB_NAME`. The initial schema above is `0001_initial.sql`.

## Authentication

Custom implementation, no third-party auth library. Pattern lifted from the codeflare repo — proven, ~250 lines of TypeScript, zero ORM or dependency churn.

### Flow

```
/api/auth/github/login
  1. Generate 32 random bytes via crypto.getRandomValues(), base64url-encoded
     (not a UUID — stronger entropy, no structural pattern)
  2. Set oauth_state cookie (HttpOnly, Secure, SameSite=Lax, Path=/, 5 min TTL)
  3. Redirect to github.com/login/oauth/authorize with client_id, redirect_uri,
     scope=user:email, state

/api/auth/github/callback
  1. Validate state cookie === state query param via constant-time comparison
     (reject 403 if mismatch). Clear oauth_state cookie.
  2. POST code to github.com/login/oauth/access_token → access token
  3. GET api.github.com/user and /user/emails in parallel → extract primary
     verified email, numeric id (stringified), login
  4. INSERT OR IGNORE into users (id, email, gh_login, tz, created_at) with
     tz='UTC' placeholder. users.id IS the GitHub numeric id as TEXT.
  5. Sign HMAC-SHA256 JWT with claims
     { sub: users.id, ghl: gh_login, sv: users.session_version, iat, exp }.
     sv is the session_version at issue time — validation rejects JWTs whose
     sv does not match the current users.session_version.
  6. Set __Host-news_digest_session cookie (HttpOnly, Secure, SameSite=Lax,
     Path=/, no Domain attribute, 1h TTL)
  7. Redirect to /settings?first_run=1 (the app hosts both onboarding and
     settings on a single /settings route — first_run=1 makes the "Welcome"
     hero visible and changes the submit button label).

Tz is NOT carried through the OAuth callback URL (keeps it out of access
logs and browser history). After /settings loads, an authenticated
POST /api/auth/set-tz sends the browser's Intl-detected tz; the handler
validates it against Intl.supportedValuesOf('timeZone') and UPDATEs users.tz.

/api/auth/github/logout
  1. UPDATE users SET session_version = session_version + 1 WHERE id = :sub
     (invalidates every outstanding JWT for this user, including any stolen
     one — a single DB write is the revocation mechanism).
  2. Clear __Host-news_digest_session cookie (Max-Age=0).
  3. Return an HTML page with an inline script that calls
     caches.delete('digest-cache-v1') then window.location='/' (direct from
     page is reliable; service worker postMessage is not).
```

### Cookie hardening

- Cookie name uses the **`__Host-` prefix** — browser enforces `Secure`, `Path=/`, and no `Domain` attribute. This blocks entire classes of cookie-injection attacks (e.g., a subdomain setting a cookie that shadows ours).
- Full attribute set: `__Host-news_digest_session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`.
- `SameSite=Lax` (not `Strict`) because we need the cookie to accompany the redirect back from GitHub OAuth.

### CSRF protection for state-changing endpoints

Every `POST/PUT/PATCH/DELETE` handler enforces an **Origin check**: reject with 403 if the `Origin` header is missing or not equal to the app's canonical origin. Workers receives `Origin` on every non-GET fetch from browsers. Combined with `SameSite=Lax` on the session cookie, this is the full CSRF defense.

The earlier spec included a double-submit CSRF token cookie. That was dropped: a non-HttpOnly token cookie is XSS-readable, so it adds no defense-in-depth beyond what the Origin check already provides. Invest the effort in XSS prevention (markdown sanitization, nonce-based CSP) instead.

### Session validation

Every protected Astro route and API endpoint calls a shared helper that:

1. Reads `__Host-news_digest_session`.
2. Verifies the HMAC signature with `OAUTH_JWT_SECRET` (constant-time compare).
3. Checks `exp` is in the future.
4. Loads the user row from D1 via `users.id = jwt.sub`.
5. Checks `jwt.sv === users.session_version` — rejects otherwise (revoked token).

Unauthenticated requests redirect to `/`.

### Rate limiting on authentication endpoints

`/api/auth/github/login` and `/api/auth/github/callback` are protected by a Cloudflare WAF rate-limiting rule (configured out-of-band, not in application code): 10 requests/minute per source IP. Prevents account-creation loops and state-cookie flooding. Application-level rate limiting on Workers requires a KV counter per IP, which is noisy — platform WAF is the right layer.

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
| `CLOUDFLARE_API_TOKEN` | For the Workers AI models catalog lookup. **Scope: `AI: Read` only** — no account edit, no Worker deploy permissions. The deployment token used in CI is separate and is never stored as a Worker secret. |

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
1. Claim the digest row: INSERT a new digest with status='in_progress',
   locked_at=now(). Use a conditional INSERT guarded by NOT EXISTS against
   any in_progress digest for this user — prevents duplicate concurrent
   generation. 15-min lock TTL (claims released if locked_at < now()-900).
2. Idempotency check: if message.trigger='scheduled' AND
   users.last_generated_local_date == message.local_date → ack and exit.
3. For each hashtag in users.hashtags_json, fan out 4 queries in parallel
   (Google News, HN, Reddit, arXiv). Per-source concurrency cap 4, 5s
   timeout each, response body capped at 1MB, items capped at 25 per source
   (max 100 total after fan-out, regardless of hashtag count).
4. Canonicalize and dedupe URLs (see URL canonicalization below).
5. Single Workers AI call with users.model_id, structured as:
   - system message: "You curate tech news. Return strict JSON. Do not
     include any HTML tags. Do not use Markdown links; use plain URLs."
   - user message: "User interests: <fenced hashtag list>. Headlines:
     <fenced JSON array of {title, url} objects>. Return top 10 as
     {title, url, one_liner, detail} — one_liner <=120 chars plaintext,
     detail is 3 plaintext bullets separated by newlines."
   Fencing (e.g., triple backticks) around user-controlled content limits
   prompt-injection blast radius.
6. Parse the LLM JSON response strictly (reject on parse error).
7. For each article: sanitize title and one_liner to plaintext (strip all
   HTML and control chars). Render detail as markdown ONLY in the client
   via a sanitizing renderer (marked + DOMPurify with allowlist: p, ul,
   ol, li, strong, em, code, br) or a server-side markdown-to-safe-HTML
   conversion before storage. Reject javascript:, data:, vbscript: URLs.
8. If LLM call or parsing fails: mark digest status='failed' with
   sanitized error_code ('llm_timeout'|'llm_invalid_json'|'all_sources_failed').
   Queue default retry (3 attempts) handles transient errors — no custom
   retry-with-shorter-prompt logic.
9. Capture execution_ms, tokens_in, tokens_out (from Workers AI response
   usage field; if absent, store NULL and UI shows "~" prefix). Compute
   estimated_cost_usd from a constants file mapping model_id → per-Mtok
   prices (bundled with the Worker; updated via code, not at runtime).
10. INSERT articles rows. UPDATE digests SET status='ready', clear lock.
11. For 'scheduled' trigger: UPDATE users SET last_generated_local_date=?
    (idempotency key for tomorrow's run).
12. Acknowledge queue message.
```

### Manual refresh

Triggered from the UI "Refresh now" button. Enqueues a `{ trigger: 'manual' }` job to the same queue with no delay.

**Rate limits** are enforced atomically in a single conditional UPDATE on the users row. Concurrent requests from the same user cannot both pass — the UPDATE returns 0 affected rows when the limit is hit:

```sql
UPDATE users SET
  last_refresh_at = :now,
  refresh_window_start = CASE WHEN :now > refresh_window_start + 86400
                              THEN :now ELSE refresh_window_start END,
  refresh_count_24h = CASE WHEN :now > refresh_window_start + 86400
                           THEN 1 ELSE refresh_count_24h + 1 END
WHERE id = :user_id
  AND (last_refresh_at IS NULL OR :now - last_refresh_at >= 300)
  AND (refresh_count_24h < 10 OR :now > refresh_window_start + 86400)
RETURNING refresh_count_24h;
```

Zero rows returned → rate-limited (return 429 with `retry_after_seconds`). One row returned → accepted, enqueue the manual refresh job. No read-then-write race.

### Rate-limit UX

When rejected, the API returns `429` with a JSON body `{ error, retry_after_seconds, reason }`. The UI shows a non-blocking toast: "You've hit today's refresh limit — try again in 4h 12m" or "Hold on — you can refresh again in 2:30". The refresh button disables with a live countdown until the cooldown expires.

### Retry strategy

- **Per-source fetch failures**: no custom retry. If a source fails, skip it. If all four sources fail for all hashtags → digest status='failed' with error_code='all_sources_failed'. Cloudflare Queues re-delivers the whole job up to 3 times if the consumer throws.
- **LLM failures**: no retry. Mark digest failed with error_code='llm_failed'. Queue re-delivery handles transient LLM unavailability.
- **No dead-letter queue**. Default Queues retry (3 attempts) is sufficient for a solo tool — DLQ inspection overhead is not justified.

### Error handling

The `error_code` column stores only sanitized short codes (e.g., `llm_timeout`, `llm_invalid_json`, `all_sources_failed`, `rate_limit_hit`). Raw exception messages, HTTP response bodies from external APIs, and stack traces are logged server-side (structured JSON) but never stored in D1 and never returned to the client. The user-facing message is generic: "Something went wrong generating your digest. Try again or check /settings."

### Loading and error states

These are first-class design surfaces, not afterthoughts. Generation takes 2–10 seconds typically, longer on large models — the user should never stare at a blank screen.

**Live generation indicator** (while a digest is being built, whether first-run, scheduled, or manual refresh):

- Full-width progress rail at the top of `/digest` showing the current pipeline phase with a short label: "Fetching sources…" → "Reading 73 headlines…" → "Summarizing with llama-3.1-8b…" → "Almost done…".
- Phase advances are pushed from the server via Server-Sent Events on `GET /api/digest/:id/events` (read-only stream; closes when `status='ready'` or `'failed'`). Falls back to 2s polling if SSE is unsupported.
- Below the rail: 10 card skeletons matching real card dimensions (no layout shift when real cards arrive). Shimmer sweep at 1.4s linear gradient, disabled under reduced-motion.
- Footer shows running clock: "Generating — 3.2s elapsed". Snaps to final execution_ms + token count + cost on completion.
- Cancellable: "Cancel" button on the rail triggers `POST /api/digest/:id/cancel` which marks the digest `status='failed' error_code='user_cancelled'`. Any in-flight fetches are aborted via `AbortController`.

**First-run loading**: identical to above but with a welcome message above the rail — "Welcome, @gh_login. Your first digest is on the way."

**Error pages**: dedicated Astro route components, not inline banners. Every error state uses the same layout (centered content, one-line headline, short explanation, one primary action, one secondary action) for consistency.

| Scenario | Headline | Explanation | Primary action | Secondary action |
|---|---|---|---|---|
| `status='failed'` (generation error) | "We couldn't build your digest" | "Something went wrong on our side. Your settings are safe." | "Try again" (re-triggers pipeline) | "Go to settings" |
| All sources returned zero results | "No stories today" | "None of your hashtags matched fresh articles in the last 24 hours. Try broader tags." | "Edit hashtags" | "Refresh anyway" |
| Rate-limited manual refresh | "Slow down a little" | "You've already refreshed X times today. Next refresh available in Yh Zm." | (disabled until cooldown, live countdown) | "Go to today's digest" |
| Offline | "You're offline" | "Showing the last digest you viewed. We'll reconnect when you're back." | (none — banner is non-modal) | "Retry now" |
| 404 (missing digest) | "Digest not found" | "This digest doesn't exist or has been deleted." | "Today's digest" | "History" |
| 500 (unhandled server error) | "Something broke" | "We've logged it. Try again in a moment." | "Retry" | "Go home" |
| Auth failure (expired/revoked session) | "You've been signed out" | "Sign back in to continue." | "Sign in with GitHub" | (none) |
| OAuth error (`access_denied`, `no_verified_email`, etc.) | Mapped from error code | Human-readable match for the code | "Try again" | "Help" |

**Visual treatment** of error pages: no illustrations, no emoji, no exclamation marks. A single icon (16–20px) in the accent color next to the headline, generous whitespace, monospace for any error code shown in a muted footer. The tone is calm and matter-of-fact — errors happen, the app handles them.

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
- **Manual refresh**: button morphs into an indeterminate progress bar while the job is in flight. On completion, the bar fades out and new cards fade in.

### Micro-interactions

- **Buttons**: `transform: scale(0.97)` on `:active`, 100ms.
- **Hashtag chips**: selecting scales from 1 → 1.1 → 1, with accent color fill sweeping in from left to right (150ms).
- **Theme toggle**: instant swap of the `data-theme` attribute with a 150ms cross-fade on the `color` and `background-color` properties. No circular wipe — View Transitions API for this single element adds complexity without proportionate value.
- **Card hover (desktop)**: lift 2px + border shifts to accent color, 200ms.
- **Link underlines**: animate stroke from 0 to 100% width on hover, 200ms.

### First-run choreography

- **Step entrance**: each of the three sections (Interests → Schedule → Model) fades in sequentially with 100ms stagger on first paint. A subtle left-side rail visualizes progress.
- **Submit button**: on click, "Generate my first digest" disables and shows an inline spinner while the out-of-band generation kicks off and the redirect to `/digest` fires.

### Page transitions

- **Route changes**: Astro View Transitions cross-fade at 250ms.
- **Digest card → Article detail**: shared-element morph — the card expands into the detail view's hero block using View Transitions' `transition:name`. Back button reverses it.
- **Route failures**: full-screen fade to a minimal error state with a "return home" action.

### Cut from scope (previously specified, removed as decorative)

Number count-up animations, typing effect for "Detected: Europe/Zurich", particle burst on chip tap, SVG checkmark draw animation, circular wipe theme transition, haptic feedback via `navigator.vibrate`. These were polish-for-polish's-sake. The earned motion above is the complete spec.

## What is explicitly out of scope for MVP

- Email delivery (read in-app only)
- Multiple digests per day
- Slack, Telegram, or RSS output
- OPML import, user-added feeds
- Sharing, bookmarking, cross-user recommendations
- Embeddings or vector search (single LLM call handles ranking)
- R2 archive of digest HTML (D1 stores markdown directly; digests are small)

These may be revisited after v1 ships.

## User stats widget

A compact stats widget rendered in the header of `/settings` (and optionally repeated at the top of `/history`). Four tiles, each a big number + small label, pulled from a single D1 query.

| Tile | Source | Example |
|---|---|---|
| Digests generated | `SELECT COUNT(*) FROM digests WHERE user_id=? AND status='ready'` | `142` |
| Articles read | `SELECT COUNT(*) FROM articles a JOIN digests d ON a.digest_id=d.id WHERE d.user_id=? AND a.read_at IS NOT NULL` | `318 of 1,420` |
| Tokens consumed | `SELECT COALESCE(SUM(tokens_in+tokens_out),0) FROM digests WHERE user_id=? AND status='ready'` | `482,193` |
| Cost to date | `SELECT COALESCE(SUM(estimated_cost_usd),0) FROM digests WHERE user_id=? AND status='ready'` | `$0.14` |

### Tracking "read"

Add `read_at INTEGER` (nullable) to the articles table. An article is marked read when the user opens its detail page (`/digest/:id/:slug`) — the server sets `read_at = now()` on first view via `UPDATE articles SET read_at = :now WHERE id = :id AND digest_id IN (SELECT id FROM digests WHERE user_id = :session_user_id) AND read_at IS NULL`. The scoped subquery enforces user_id — IDOR-safe.

Clicking the source link does NOT mark read, because many users open the source in a new tab and never look at the summary. Opening the detail view is the signal that the user engaged with the app's content.

### Widget implementation

No third-party charting/dashboard library. The widget is a single Astro component (~40 lines) rendering four tiles in a CSS grid. For a solo tool, pulling in `recharts`, `nivo`, `apexcharts`, or `shadcn/ui` is unjustified weight. Tailwind utility classes handle the styling; the "big number + small label" pattern is trivial to build and looks better hand-tuned than any library default.

Optional v1.1: a sparkline next to each tile showing the last 30 days. Pure SVG, ~20 lines — not a library. Skip for MVP.

### My take on this requirement

**Worth it.** Stats add personal value, make the app feel like yours, and cost very little to implement (one SQL query, one component, one new column). The "articles read" tile is the most valuable because it's the only stat that measures engagement rather than volume — it tells you whether the digests are actually useful. Keep it to four tiles; resist the urge to add charts, streaks, leaderboards, or "top hashtag this week" — those are v2 decisions.

## Security headers

Every response includes these headers, set by a Cloudflare Worker response middleware:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.github.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://github.com` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(), clipboard-read=()` |

**Nonce-based script CSP**: Astro middleware generates a fresh random nonce per request (base64url of 16 bytes from `crypto.getRandomValues`). Both the CSP header and every inline `<script>` tag get the nonce. This allows the theme-init inline script (which runs before CSS loads to prevent FOUC) without opening the door to injected scripts. `'unsafe-inline'` remains on `style-src` because Astro's component styles use it; acceptable risk given that CSS injection is low-severity and sanitized markdown blocks `<style>` elements anyway.

`X-Frame-Options: DENY` is not emitted; CSP `frame-ancestors 'none'` supersedes it in all modern browsers.

## Observability

Structured JSON logs only. No Analytics Engine, no Logpush, no separate metrics pipeline — Cloudflare Logs surface `console.log` output as queryable fields, which is sufficient for a solo tool.

Every log line emits `console.log(JSON.stringify({ ts, level, event, user_id?, ...fields }))`. The events worth logging:

| Event | Purpose |
|---|---|
| `auth.login` | `{ user_id, gh_login, new_user, status: 'success'\|'failed', error_code? }` |
| `digest.dispatch` | `{ user_count, elapsed_ms }` (daily cron summary, one line per run) |
| `digest.generation` | `{ user_id, digest_id, trigger, status, execution_ms?, tokens_in?, tokens_out?, article_count?, error_code? }` |
| `source.fetch.failed` | `{ source_name, hashtag, http_status?, error_code }` |
| `refresh.rejected` | `{ user_id, reason: 'cooldown'\|'daily_cap', retry_after_seconds }` |

Internal error details (exception messages, response bodies) are logged at `level: 'error'` but never stored in D1 and never returned to clients. Adding an aggregation layer later is a one-commit change — not needed up front.

## History pagination

`/history` renders the 30 most recent digests newest first with a "Load more" button that extends the list by 30. Query: `SELECT ... FROM digests WHERE user_id = :session_user_id ORDER BY generated_at DESC LIMIT 30 OFFSET :offset`. Simple offset pagination — a solo user will accumulate at most ~365 digests per year, so the duplicate-risk scenarios that justify cursor pagination do not apply.

## Deployment

Cloudflare Workers. Daily Cron Trigger configured in `wrangler.toml` (`crons = ["0 0 * * *"]`). D1, KV (model catalog only), and Queues (`digest-jobs` + `digest-jobs-dlq`) bindings provisioned via `wrangler`. GitHub OAuth client ID/secret, `OAUTH_JWT_SECRET`, and Cloudflare API token configured as Worker secrets. Schema migrations applied with `wrangler d1 migrations apply`.
