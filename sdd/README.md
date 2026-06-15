# news-digest — Product Specification

## Vision

A personalized daily tech news digest. Users sign in with a federated identity provider (GitHub or Google), curate interests as hashtags, and receive an AI-curated digest at their chosen time each day. Swiss-minimal reading experience with cost transparency on every digest, email notifications, and PWA-installable on mobile.

## Actors

| Actor | Description |
|-------|-------------|
| **User** | A signed-in user (federated via GitHub or Google) curating hashtags and reading digests |
| **Admin** | The deployment operator — gated by Cloudflare Access at the zone level — who can force a fresh scrape tick and bulk-re-discover feeds for stuck tags |

"System" (cron, Queue consumer, service worker) is a qualifier, not an actor.

## Design Principles

1. **Simplicity first, efficiency second, UX third** — every component must earn its weight against these priorities, in that order
2. **Content follows explicit interest** — hashtags drive every fetch and every LLM ranking decision; there is no implicit recommendation engine
3. **Transparency by default** — every digest surfaces execution time, token count, and estimated cost, so users always know what it took to produce
4. **Email is the completion signal** — the app never demands real-time attention; client polling is only a fallback for active-page manual refresh
5. **Beautiful reading is MVP, not v2** — Swiss-minimal aesthetic with purposeful motion and dark mode are part of the first ship
6. **Strong consistency where decisions hinge on it, edge caching everywhere else** — D1 for user/digest/queue state, KV for caches that tolerate eventual consistency
7. **Security by construction** — no inline scripts, server-side fetches are SSRF-guarded with strict timeout and size caps, LLM output rendered as plaintext only

## Canonical Spec Layout

This file is the root spec index. The `sdd/` tree intentionally contains this README plus `sdd/spec/`. All requirement domains and support files live under `sdd/spec/`; root-level `sdd/*.md` domain files are not canonical and should not exist.

Current layout count: `sdd/README.md` + 17 files under `sdd/spec/` = 18 tracked spec-tree files.

## Requirement Domains

These 11 files contain REQ-* requirements.

| # | Domain | File | Priority | Description |
|---|--------|------|----------|-------------|
| 1 | Authentication | [`spec/authentication.md`](spec/authentication.md) | P0 | OAuth/OIDC, sessions, revocation, CSRF, account deletion |
| 2 | Onboarding & Settings | [`spec/settings.md`](spec/settings.md) | P0 | First-run flow, hashtags, schedule, email toggle |
| 3 | Source Discovery | [`spec/discovery.md`](spec/discovery.md) | P0 | Feed discovery, validation, retry, prompt-injection protection |
| 4 | Digest Generation | [`spec/generation.md`](spec/generation.md) | P0 | Cron, queues, summarization, dedupe, source ingestion |
| 5 | Reading Experience | [`spec/reading.md`](spec/reading.md) | P0 | Digest grid, article detail, empty/error states, starring |
| 6 | Email Notifications | [`spec/email.md`](spec/email.md) | P0 | Resend integration, digest email content, send policy |
| 7 | History & Stats | [`spec/history.md`](spec/history.md) | P1 | Past digest history, search, stats widget |
| 8 | Design System | [`spec/design.md`](spec/design.md) | P0 | Typography, palette, theme toggle, motion |
| 9 | PWA & Mobile | [`spec/pwa.md`](spec/pwa.md) | P1 | Manifest, installability, mobile layout, safe areas |
| 10 | Observability | [`spec/observability.md`](spec/observability.md) | P1 | Logs, sanitized errors, security headers, admin operations |
| 11 | Rate Limits | [`spec/rate-limits.md`](spec/rate-limits.md) | P0 | Cross-cutting application-layer rate-limit policy |

## Support Files

These 6 files are canonical support files, not product-domain requirement files.

| File | Purpose |
|---|---|
| [`spec/constraints.md`](spec/constraints.md) | CON-* cross-cutting technology and security guardrails |
| [`spec/glossary.md`](spec/glossary.md) | Canonical terms used by specs and documentation |
| [`spec/changes.md`](spec/changes.md) | Current specification changelog |
| [`spec/changes-archive-2026-04.md`](spec/changes-archive-2026-04.md) | Archived April 2026 changelog entries |
| [`spec/config.yml`](spec/config.yml) | SDD enforcement configuration |
| [`spec/.review-queue.md`](spec/.review-queue.md) | SDD review queue; should say `No open findings.` when clean |

## Out of Scope

The following were considered and intentionally excluded from the MVP:

- **Multiple digests per day** — one scheduled run per user per local day, with rate-limited manual refreshes
- **Slack, Telegram, or RSS output channels** — email is the only notification channel in MVP
- **User-added feeds / OPML import** — discovery via LLM + generic search APIs covers both default and custom hashtags without per-user feed management
- **Cross-user sharing and recommendations** — the product is personal, not social. Per-user starring (REQ-STAR-001) is in scope and keeps an article exempt from the 14-day retention sweep; what stays out of scope is publishing or recommending one user's reading list to others.
- **Unbounded server-side fetching** — article body fetching is in scope per REQ-PIPE-010 and CON-SEC-002 but only via the SSRF filter (HTTPS-only, no private/loopback/link-local ranges), an 8-second timeout, and a 1.5 MB download cap; arbitrary URL resolution remains explicitly out of scope
- **Multi-tenancy** — every deployment serves a single end-user (the **User** actor); the **Admin** actor is the deployment operator. Cross-user isolation, per-tenant data partitioning, and shared-instance billing are not in scope.
- **Cloudflare WAF-based OAuth rate limiting** (was REQ-AUTH-006) — infrastructure policy, not product behaviour; handled outside the spec if ever needed
- **Sender domain verification walkthrough** (was REQ-MAIL-003) — operational setup task; deployment docs already cover Resend DNS configuration
- **Offline reading via service worker cache** (was REQ-PWA-002) — PWA installability (REQ-PWA-001) ships without offline content caching; the dashboard requires network on launch

## Documentation

Implementation documentation lives in `documentation/`:
- [`architecture.md`](../documentation/lanes/architecture.md) — System overview, components, data flow
- [`api-reference.md`](../documentation/lanes/api-reference.md) — All API endpoints
- [`configuration.md`](../documentation/lanes/configuration.md) — Env vars, secrets, bindings
- [`deployment.md`](../documentation/lanes/deployment.md) — Dev setup and deployment steps
- [`decisions/README.md`](../documentation/decisions/README.md) — Architecture Decision Records
