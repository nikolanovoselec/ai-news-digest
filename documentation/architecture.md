# Architecture

System overview, component map, and data flow.

**Audience:** Developers

---

## Overview

news-digest is a single Cloudflare Worker serving an Astro-rendered app. Every 5 minutes, a Cron Trigger runs a stuck-digest sweeper, processes up to 3 pending source-discovery tasks, and enqueues scheduled digest-generation jobs to a Cloudflare Queue. The queue consumer runs the same `generateDigest` function that powers manual refreshes. See [`sdd/README.md`](../sdd/README.md) for product intent.

## Components

| Component | Role |
|---|---|
| Astro Worker (request handler) | Serves all HTML pages and JSON APIs; runs in the Cloudflare Workers runtime |
| Cron Trigger | 5-minute trigger — sweeper + discovery + scheduled-digest dispatcher |
| Queue Consumer | Processes `digest-jobs` messages; runs `generateDigest` in isolate-per-message |
| D1 | Strongly-consistent storage for users, digests, articles, pending_discoveries |
| KV | Edge-distributed cache for discovered sources, headlines, source health |
| Workers AI | LLM inference for digest summarization and source discovery |
| Resend | Transactional email for "digest ready" notifications |
| GitHub OAuth | Only sign-in mechanism |

## Source Modules

Expected source layout once implementation begins:

| Path | Responsibility | Implements |
|---|---|---|
| `src/lib/db.ts` | D1 wrapper with `PRAGMA foreign_keys=ON`, prepared statements, `batch()` helper | (shared, not REQ-specific) |
| `src/lib/models.ts` | Hardcoded `MODELS` list + `DEFAULT_MODEL_ID` | [REQ-SET-004](../sdd/settings.md#req-set-004-model-selection) |
| `src/lib/prompts.ts` | `DIGEST_SYSTEM`, `DISCOVERY_SYSTEM`, prompt builders, `LLM_PARAMS` | [REQ-GEN-005](../sdd/generation.md#req-gen-005-single-call-llm-summarization), [REQ-DISC-001](../sdd/discovery.md#req-disc-001-llm-assisted-per-tag-feed-discovery) |
| `src/lib/session-jwt.ts` | HMAC-SHA256 sign/verify for session cookies | [REQ-AUTH-002](../sdd/authentication.md#req-auth-002-session-cookie-and-instant-revocation) |
| `src/lib/sources.ts` | Generic source adapters + discovered-feed fetcher | [REQ-GEN-003](../sdd/generation.md#req-gen-003-source-fan-out-with-caching), [REQ-DISC-001](../sdd/discovery.md#req-disc-001-llm-assisted-per-tag-feed-discovery) |
| `src/lib/generate.ts` | The single `generateDigest(user, trigger, digestId?)` function | [REQ-GEN-001](../sdd/generation.md#req-gen-001-scheduled-generation-via-cron-dispatcher) |
| `src/lib/email.ts` | Resend client + "digest ready" template | [REQ-MAIL-001](../sdd/email.md#req-mail-001-digest-ready-email) |
| `src/middleware/auth.ts` | Session validation, `session_version` check, auto-refresh | [REQ-AUTH-002](../sdd/authentication.md#req-auth-002-session-cookie-and-instant-revocation) |
| `src/middleware/security-headers.ts` | CSP, HSTS, etc. on every response | [REQ-OPS-003](../sdd/observability.md#req-ops-003-security-headers-on-every-response) |
| `src/pages/api/auth/github/*.ts` | OAuth login, callback, logout handlers | [REQ-AUTH-001](../sdd/authentication.md#req-auth-001-sign-in-with-github) |
| `src/pages/api/settings.ts` | GET/PUT handlers for user settings | [REQ-SET-001](../sdd/settings.md#req-set-001-unified-first-run-and-edit-flow) |
| `src/pages/api/digest/*.ts` | Refresh, today, by-id, article read | [REQ-GEN-002](../sdd/generation.md#req-gen-002-manual-refresh-with-rate-limiting), [REQ-READ-005](../sdd/reading.md#req-read-005-pending-today-banner) |
| `src/pages/api/discovery/*.ts` | Status, retry | [REQ-DISC-002](../sdd/discovery.md#req-disc-002-discovery-progress-visibility), [REQ-DISC-004](../sdd/discovery.md#req-disc-004-manual-re-discover) |
| `src/pages/*.astro` | Landing, settings, digest, article detail, history | [REQ-READ-001](../sdd/reading.md#req-read-001-overview-grid-of-todays-digest), [REQ-SET-001](../sdd/settings.md#req-set-001-unified-first-run-and-edit-flow) |
| `src/worker.ts` | Entry point + cron handler | [REQ-GEN-001](../sdd/generation.md#req-gen-001-scheduled-generation-via-cron-dispatcher), [REQ-GEN-007](../sdd/generation.md#req-gen-007-stuck-digest-sweeper) |
| `src/queue/digest-consumer.ts` | Queue handler that invokes `generateDigest` | [REQ-GEN-001](../sdd/generation.md#req-gen-001-scheduled-generation-via-cron-dispatcher), [REQ-GEN-002](../sdd/generation.md#req-gen-002-manual-refresh-with-rate-limiting) |
| `public/theme-init.js` | External theme resolver loaded with `defer` before CSS | [REQ-DES-002](../sdd/design.md#req-des-002-light-and-dark-mode-with-no-flash) |
| `migrations/0001_initial.sql` | D1 schema (users, digests, articles, pending_discoveries) | (foundational) |

## Request Lifecycle

### Scheduled digest generation

```
Cron fires (every 5 min)
  → stuck-digest sweeper (UPDATE digests WHERE generated_at < now-600)
  → discovery processor (up to 3 pending tags)
  → scheduling pass (for each tz, find due users)
  → enqueue to digest-jobs queue (sendBatch)
Queue consumer (up to 10 concurrent isolates)
  → generateDigest(user, 'scheduled')
  → fan out to generic sources + discovered feeds (cached via headlines:*:* KV)
  → single Workers AI call
  → db.batch([articles, digest status, user last_generated_local_date])
  → if email_enabled: Resend POST (non-blocking)
```

### Manual refresh

```
Browser → POST /api/digest/refresh
  → atomic UPDATE users (rate-limit check)
  → conditional INSERT digests (409 if in-progress exists)
  → enqueue to digest-jobs queue
  → return 202 { digest_id }
Browser polls GET /api/digest/:id every 5s until status != 'in_progress'
```

## Data Flow

Users are the single top-level entity. Every digest belongs to a user; every article belongs to a digest. Foreign keys cascade on delete. Pending discoveries are per-user rows but discovery results (sources per tag) are globally shared in KV so multiple users benefit from a single discovery run.

Headlines cache (`headlines:{source}:{tag}`) is shared globally with a 10-minute TTL, which is why thundering herds at 08:00 local do not hammer upstream sources.

---

## Related Documentation

- [Configuration](configuration.md) — Env vars, secrets, bindings
- [API Reference](api-reference.md) — Endpoint contracts
- [Decisions](decisions/README.md) — Architectural decisions and rationale
