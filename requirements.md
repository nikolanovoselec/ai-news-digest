# news-digest

A personalized daily tech news digest. Sign in with GitHub, pick your interests as hashtags, and get an AI-curated digest once per day at a time you choose. No feeds to manage — hashtags drive what gets scraped.

## How it works

1. **Sign in with GitHub** — account is created on first login
2. **Pick your interests** — tap hashtags from 20 defaults or type your own
3. **Set your digest time** — one scheduled generation per day in your timezone
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
| Scheduling | Cloudflare Cron Trigger (scans every 15 min) |
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

Results are deduplicated by resolved URL, then a single LLM call ranks the top 10 across all hashtags and writes the one-line + longer summary for each.

**Google News caveat**: Google News links redirect through `news.google.com/articles/...`. We resolve the final URL with a HEAD request before storing so the source link points to the real publisher.

## Default hashtag proposals

Shown as toggleable chips on the settings page. User may select any subset and add custom hashtags.

```
#cloudflare  #agenticai  #mcp         #aws            #aigateway
#llm         #ragsystems #vectordb    #workersai      #durableobjects
#typescript  #rust       #webassembly #edgecompute    #postgres
#openai      #anthropic  #opensource  #devtools       #observability
```

## Model selection

The settings page renders a dropdown populated from the Cloudflare API:

```
GET https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/models/search?task=Text+Generation
```

The result is cached in KV for one hour. The dropdown displays each model's name and description; the selected model ID is stored on the user row. The model used for each digest is also stored on the digest row, so the history view shows which model produced each result.

**Default**: `@cf/meta/llama-3.1-8b-instruct-fast`.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page with "Sign in with GitHub" |
| `/onboarding` | First-run configuration: hashtags, digest time, model. Only reachable before first digest is set up. |
| `/settings` | Same form as onboarding, edit-mode. Also hosts logout, account deletion, install-app prompt |
| `/digest` | Today's digest — card grid with one-line summaries, "Refresh now" button, execution/cost footer |
| `/digest/:id/:slug` | Article detail — longer summary with critical points and source link |
| `/history` | Past digests, each with its own execution/cost metrics |

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

Single button in the header (sun icon in light, moon in dark). One click toggles the `data-theme` attribute on `<html>` and persists to `localStorage.theme`. Default follows `prefers-color-scheme`. No flash of wrong theme on load — the choice is read and applied in an inline `<script>` before the first paint.

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
   b. Schedule — hour picker (0-23, local time). Timezone shown read-only as
      "detected: Europe/Zurich" with no edit control.
   c. Model — Workers AI model dropdown, default pre-selected, collapsible
      "Advanced" disclosure hides this by default.
4. Submit button: "Generate my first digest".
5. On submit: UPDATE users SET hashtags, digest_hour, model_id, then trigger
   the digest pipeline immediately and redirect to /digest with a loading
   state while generation runs.
```

### Middleware gating

Every authenticated request checks: if `hashtags IS NULL OR digest_hour IS NULL` AND path is not `/onboarding` or an auth route → redirect to `/onboarding`. Once both are set, visiting `/onboarding` redirects to `/settings` (edit-mode reuse of the same form component).

### Timezone handling

Captured once at first login from the browser and stored on the users row. Not user-editable. If the browser's timezone changes between visits (user travels), the app continues to use the stored value unless the user explicitly re-logs in. Cron scans compute each user's "due" moment as `digest_hour` interpreted in their stored `tz`.

## Data model (D1)

```sql
users (
  id              TEXT PRIMARY KEY,
  github_id       TEXT UNIQUE,
  email           TEXT,
  tz              TEXT,               -- IANA timezone
  digest_hour     INTEGER,            -- 0-23 local time
  hashtags        TEXT,               -- comma-separated
  model_id        TEXT,               -- Workers AI model id
  next_due_at     INTEGER,            -- unix ts, for cron scan
  created_at      INTEGER
)

digests (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  generated_at    INTEGER,
  execution_ms    INTEGER,
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  model_id        TEXT,
  status          TEXT                -- pending | ready | failed
)

articles (
  id              TEXT PRIMARY KEY,
  digest_id       TEXT,
  source_url      TEXT,
  title           TEXT,
  one_liner       TEXT,               -- <=120 chars
  detail_md       TEXT,               -- longer summary, markdown
  published_at    INTEGER,
  rank            INTEGER
)

-- no sessions table: sessions are stateless JWTs in HttpOnly cookies
```

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
     verified email, numeric id, login
  5. INSERT OR IGNORE into users (github_id, email, tz, ...) for JIT provisioning
     (tz comes from a query param posted by /, captured via Intl API)
  6. Sign HMAC-SHA256 JWT with { sub: github_id, email, ghLogin, iat, exp }
  7. Set news_digest_session cookie (HttpOnly, Secure, SameSite=Lax, 1h TTL)
  8. Redirect to /onboarding (if hashtags or digest_hour null) else /digest

/api/auth/github/logout
  1. Clear news_digest_session cookie (Max-Age=0)
  2. Redirect to /
```

### Session validation

Every protected Astro route and API endpoint calls a shared helper that reads `news_digest_session`, verifies the HMAC signature with `OAUTH_JWT_SECRET`, checks `exp`, and returns the user row from D1. Unauthenticated requests redirect to `/`.

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

```
1. Cron Worker runs every 15 min
2. SELECT users WHERE next_due_at <= now()
3. For each due user (or on manual refresh):
   a. For each hashtag, fan out 4 queries (Google News, HN, Reddit, arXiv)
   b. Dedupe by resolved URL
   c. Single Workers AI call with selected model:
      "User cares about [hashtags]. From these N headlines, pick top 10
       and return {title, url, one_liner, detail}"
   d. Insert digest + articles rows, capturing execution_ms and token usage
   e. Update users.next_due_at to next local digest_hour
4. Manual refresh: same pipeline, rate-limited to once per 5 min per user
   AND capped at 10 refreshes per rolling 24h window per user to bound cost
```

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

## Deployment

Cloudflare Workers. Cron Trigger configured in `wrangler.toml` to run every 15 minutes. D1 and KV bindings provisioned via `wrangler` (KV is used only for caching the Workers AI model catalog, not for sessions). GitHub OAuth client ID/secret, `OAUTH_JWT_SECRET`, and Cloudflare API token configured as Worker secrets.
