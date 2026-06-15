# news-digest — Documentation

**Audience:** Developers, Operators

This is the implementation documentation. The product specification (what the system does and why) lives at [`sdd/README.md`](../sdd/README.md). This folder describes how the system actually works.

---

## Canonical Documentation Layout

This file is the documentation index. The `documentation/` tree intentionally contains this README, lane files under `documentation/lanes/`, the ADR ledger under `documentation/decisions/`, and one internal coverage queue. Root-level documentation files other than this README and `.doc-coverage.md` are not canonical.

Current layout count: `documentation/README.md` + 9 indexed files = 10 tracked documentation files.

## Implementation Lanes

These 7 files are the canonical operational documentation lanes.

| Document | File | Audience | Description |
|----------|------|----------|-------------|
| Architecture | [`lanes/architecture.md`](lanes/architecture.md) | Developers | System overview, components, data flow |
| API Reference | [`lanes/api-reference.md`](lanes/api-reference.md) | Developers | Public/internal endpoints and request/response formats |
| Admin API Reference | [`lanes/api-reference-admin.md`](lanes/api-reference-admin.md) | Operators | `/api/admin/*` endpoints for queue replay, discovery retries, and health probes |
| Configuration | [`lanes/configuration.md`](lanes/configuration.md) | Developers, Operators | Environment variables, secrets, Cloudflare bindings |
| Deployment | [`lanes/deployment.md`](lanes/deployment.md) | Developers, Operators | Dev setup, deployment steps, CI secrets |
| Security | [`lanes/security.md`](lanes/security.md) | Developers, Operators | CSP, HSTS, cookie policy, rate limiting |
| Observability | [`lanes/observability.md`](lanes/observability.md) | Developers, Operators | Structured logs, rate-limiter atomicity, fingerprint-drift rationale |

## Decision and Support Files

These 2 files are canonical documentation support files, not lane docs.

| File | Purpose | Audience |
|---|---|---|
| [`decisions/README.md`](decisions/README.md) | Architecture Decision Records | Developers |
| [`.doc-coverage.md`](.doc-coverage.md) | Documentation coverage/review queue; should say `No open findings.` when clean | Maintainers |

---

## Glossary

The codebase and the product spec (`sdd/`) use several names interchangeably for the same concepts. This table is a reading aid — both columns are valid in the wild, and the right column lists synonyms you'll hit while searching.

| Term used in this folder | Synonyms used elsewhere | Definition |
|---|---|---|
| **article pool** | "global pool", "global article pool", "shared article pool", "populated pool" | The set of summarised articles produced by the most recent global scrape; rendered identically to every user |
| **scrape run** | "scrape tick", "tick" (only in scrape-pipeline contexts) | One end-to-end execution of the global-feed pipeline: coordinator → chunks → finalize |
| **chunk** | — | One LLM-summarisation message produced by the coordinator and processed by `scrape-chunk-consumer` |
| **finalize pass** | "cross-chunk dedup pass", "dedup pass" | The same-story semantic-dedup phase that runs after the last chunk completes ([REQ-PIPE-003](../sdd/spec/generation.md#req-pipe-003-same-story-dedupe--core-matching-contract)) |
| **update-in-progress indicator** | "in-flight progress display" | The `/digest` and `/settings` UI element that polls `GET /api/scrape-status` while a scrape run is active |

New prose written in this folder should prefer the left column for consistency. Note: "tick" by itself remains the natural term for cron firings (e.g., "the every-5-minute tick fires the email dispatcher"); use it as a synonym for "scrape run" only when context makes the pipeline-execution meaning unambiguous.

## Related Documentation

- [Product Specification](../sdd/README.md) — Requirements and design intent
- [Project README](../README.md) — Project overview and quickstart
