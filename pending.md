# Pending Work

In-flight tasks and known gaps. This is NOT the spec — requirements live in `sdd/`.

---

## Partial REQs with deferred scope

### REQ-SET-008 AC 4 — `POST /api/tags/restore` server behaviour
Button + native form POST covered by `tests/settings/tag-curation.test.ts`.
The server endpoint itself (writes `DEFAULT_HASHTAGS`, 303-redirects
to `/digest`) has only manual verification. Add a unit test alongside
`tests/settings/api.test.ts`.

### Test-name migration after auth domain split
Tests currently cite `REQ-AUTH-001 AC 8 / 9 / 10` for behavior now
owned by REQ-AUTH-006 (Admin gating), REQ-AUTH-010 (Dev-bypass guard),
and REQ-RATE-001 (rate-limit policy). Rename the relevant
`describe`/`it` blocks so spec-reviewer's literal-match coverage rule
attributes the tests to the new REQ IDs.

### Test-name migration for 2026-05-13 Partial demotes
Eleven REQs were demoted Implemented → Partial by `/sdd clean --all`
on 2026-05-13 because no test file literally names the new REQ ID
(test name still cites the parent REQ from before the split). Rename
`describe`/`it` blocks so spec-reviewer's CQ-1 truth-check attributes
existing coverage to each REQ. Affected REQ IDs and current test
files:

- REQ-MAIL-003 → `tests/email/`, `tests/generate/cron.test.ts`
- REQ-PIPE-010, REQ-PIPE-011 → `tests/scraping/` (parent REQ-PIPE-001)
- REQ-PIPE-012, REQ-PIPE-013 → `tests/pipeline/finalize-vectorize.test.ts`,
  `tests/pipeline/bidirectional-dedup.test.ts` (parent REQ-PIPE-003)
- REQ-PIPE-014 → `tests/admin/historical-dedup.test.ts`,
  `tests/admin/dedup-diag.test.ts`, `tests/admin/embed-backfill.test.ts`
  (parent REQ-PIPE-003)
- REQ-PIPE-015 → `tests/queue/chunk-consumer.test.ts` (parent REQ-PIPE-002)
- REQ-PIPE-016 → `tests/queue/pipeline-consumer.test.ts` (parent REQ-PIPE-006)
- REQ-HIST-003 → `tests/history/api.test.ts`, `tests/history/page.test.ts`
  (parent REQ-HIST-001)
- REQ-READ-008 → `tests/reading/tag-railing-flip.test.ts`
  (parent REQ-READ-007)
- REQ-SET-008 → no current test (REQ ID found only in source); add a
  unit test alongside `tests/settings/api.test.ts`

## Operational TODOs

### 12 curated source URLs currently 4xx
Found by `scripts/validate-curated-sources.mjs` on 2026-04-23. The
coordinator swallows failures so these are non-blocking, but each is
~10 candidates of lost breadth per hour. Swap URLs or drop them:

- netlify-blog, perplexity-blog (403), mistral-news,
  modelcontextprotocol, zscaler-blog, datadog-blog, illumio-blog,
  honeycomb-blog, turso-blog, anthropic-engineering, anthropic-news
- azure-updates returns an unexpected body prefix (probably a JSON
  login redirect)

### Hardcoded sitemap origin in robots.txt / llms.txt
`Sitemap: https://news.graymatter.ch/sitemap.xml` is baked in as a
string; fork deployments serve the production URL from their own
origin. robots.txt requires absolute URLs per RFC; a deploy-time
template substitution is the cleanest fix.
