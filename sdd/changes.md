# Spec Changes

Semantic changes to the specification. Git history captures diffs; this file captures intent.

Each entry is dated, ≤2 sentences, user-facing only. No commit SHAs. No "verification pass" entries. No spec cleanup or format fixes (those live in git history).

## 2026-04-22

- Phase 2 (authentication) and Track B (design system, PWA install, observability) shipped: 11 requirements moved from Planned to Implemented with passing test coverage. REQ-PWA-003 (mobile-first safe-area layout) is Partial — code ships but lacks automated tests.
- Initial product specification bootstrapped from `requirements.md` via `/sdd init` with `enforce_tdd: true`. Scope: 10 domains covering authentication, onboarding, source discovery, digest generation, reading, email, history, design system, PWA, and observability.
