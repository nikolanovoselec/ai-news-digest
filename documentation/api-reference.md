# API Reference

All public and internal API endpoints.

**Audience:** Developers

Every mutating endpoint requires a valid session cookie and an `Origin` header matching the app's canonical origin (see [REQ-AUTH-003](../sdd/authentication.md#req-auth-003-csrf-defense-for-state-changing-endpoints)). All JSON responses use the shape `{ error: string, code: string, ...extras }` for errors.

---

## Authentication

### GET /api/auth/github/login

Initiates GitHub OAuth. Generates random `state`, sets `oauth_state` cookie (HttpOnly, 5-min TTL), redirects to GitHub.

**Implements:** [REQ-AUTH-001](../sdd/authentication.md#req-auth-001-sign-in-with-github)

### GET /api/auth/github/callback

Handles GitHub's OAuth redirect. Validates `state`, exchanges code for access token, extracts primary verified email, creates or looks up user, sets session cookie, redirects to `/settings?first_run=1` or `/digest`.

**Implements:** [REQ-AUTH-001](../sdd/authentication.md#req-auth-001-sign-in-with-github), [REQ-AUTH-004](../sdd/authentication.md#req-auth-004-oauth-error-surfacing)

**Error responses** (redirect to `/?error={code}`): `access_denied`, `no_verified_email`, `invalid_state`, `oauth_error`.

### POST /api/auth/github/logout

Bumps `session_version`, clears cookie, redirects to `/?logged_out=1`.

**Implements:** [REQ-AUTH-002](../sdd/authentication.md#req-auth-002-session-cookie-and-instant-revocation)

### POST /api/auth/set-tz

**Request:** `{ tz: string }` (IANA timezone)

**Response:** `200 { ok: true }` | `400 invalid_tz` | `401`

**Implements:** [REQ-SET-003](../sdd/settings.md#req-set-003-scheduled-digest-time-with-timezone)

### DELETE /api/auth/account

**Request:** `{ confirm: "DELETE" }`

**Response:** `200 { ok: true }` (session cleared) | `400 confirm_required` | `401`

**Implements:** [REQ-AUTH-005](../sdd/authentication.md#req-auth-005-account-deletion)

---

## Settings

### GET /api/settings

**Response:** `{ hashtags: string[], digest_hour: int, digest_minute: int, tz: string, model_id: string, email_enabled: bool, first_run: bool }`

**Implements:** [REQ-SET-001](../sdd/settings.md#req-set-001-unified-first-run-and-edit-flow)

### PUT /api/settings

**Request:** `{ hashtags: string[], digest_hour: int, digest_minute: int, model_id: string, email_enabled: bool }`

**Response:** `200 { ok: true, discovering: string[] }` — `discovering` lists any newly-added tags that will trigger discovery on the next cron.

**Error codes:** `invalid_hashtags`, `invalid_time`, `invalid_model_id`, `invalid_email_enabled`.

**Implements:** [REQ-SET-002](../sdd/settings.md#req-set-002-hashtag-curation), [REQ-SET-003](../sdd/settings.md#req-set-003-scheduled-digest-time-with-timezone), [REQ-SET-004](../sdd/settings.md#req-set-004-model-selection), [REQ-SET-005](../sdd/settings.md#req-set-005-email-notification-preference)

---

## Digests

### GET /api/digest/today

**Response:** `{ digest: {...} | null, articles: [...], live: bool, next_scheduled_at: int | null }`

Returns the most recent digest row for this user; `live=true` when `status='in_progress'`; `next_scheduled_at` is the unix ts of the next scheduled run when today's has not yet generated.

**Implements:** [REQ-READ-001](../sdd/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-READ-005](../sdd/reading.md#req-read-005-pending-today-banner)

### GET /api/digest/:id

**Response:** Same shape as `/today` for a specific digest. Query is scoped: `SELECT * FROM digests WHERE id = ? AND user_id = :session_user_id` — returns 404 if not found or not owned.

**Implements:** [REQ-READ-001](../sdd/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-READ-004](../sdd/reading.md#req-read-004-live-generation-state)

### POST /api/digest/refresh

Manual refresh. Rate-limited to once per 5 minutes and 10 per rolling 24h. Runs a conditional INSERT to prevent duplicate in-progress digests.

**Response:** `202 { digest_id, status: 'in_progress' }`

**Error codes:** `rate_limited` (429 with `retry_after_seconds`, `reason: cooldown|daily_cap`), `already_in_progress` (409).

**Implements:** [REQ-GEN-002](../sdd/generation.md#req-gen-002-manual-refresh-with-rate-limiting)

---

## Discovery

### GET /api/discovery/status

**Response:** `{ pending: string[] }` — tags this user is waiting on for discovery.

**Implements:** [REQ-DISC-002](../sdd/discovery.md#req-disc-002-discovery-progress-visibility)

### POST /api/discovery/retry

**Request:** `{ tag: string }`

**Response:** `200 { ok: true }` | `400 unknown_tag` | `401`

Verifies the tag is in the user's `hashtags_json`, clears `sources:{tag}` and `discovery_failures:{tag}` KV entries, inserts a fresh `pending_discoveries` row.

**Implements:** [REQ-DISC-004](../sdd/discovery.md#req-disc-004-manual-re-discover)

---

## History and Stats

### GET /api/history?offset=0

**Response:** `{ digests: [...], has_more: bool }` — up to 30 per page ordered by `generated_at DESC`.

**Implements:** [REQ-HIST-001](../sdd/history.md#req-hist-001-paginated-past-digests)

### GET /api/stats

**Response:** `{ digests_generated: int, articles_read: int, articles_total: int, tokens_consumed: int, cost_usd: number }`

**Implements:** [REQ-HIST-002](../sdd/history.md#req-hist-002-user-stats-widget)

---

## Related Documentation

- [Architecture](architecture.md) — Component overview
- [Configuration](configuration.md) — Required env vars and secrets
