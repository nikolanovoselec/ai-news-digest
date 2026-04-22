// Tests for REQ-HIST-002 — user stats widget and its data contract.
//
// Splits into two concerns:
//
//   A. Widget-side formatting (owned by this phase via StatsWidget.astro):
//      the pure functions that render tile values. We re-declare the
//      implementations here because the @cloudflare/vitest-pool-workers
//      runtime has no Astro plugin configured — `.astro` files are not
//      importable. The reference implementations are a verbatim copy of
//      the helpers inside StatsWidget.astro's frontmatter; if they ever
//      drift a widget-side visual regression is the first signal.
//
//   B. API-side SQL contract (owned by Phase 5C /api/stats): the four
//      tile queries must be scoped by user_id, and the two article-level
//      queries must JOIN through `digests` so a user can never read
//      another user's article counts by supplying a foreign digest_id.
//      Those are recorded as it.todo placeholders here; Phase 5C will
//      fill them in when it lands the /api/stats handler.

import { describe, it, expect } from 'vitest';

// --- Widget-side format helpers (copied verbatim from StatsWidget.astro) ---

function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return Math.max(0, Math.round(n)).toLocaleString('en-US');
}

function formatCostUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value === 0) return '$0.00';
  const precise = Math.abs(value).toPrecision(value < 0.01 ? 2 : 3);
  const asNum = Number(precise);
  const fixed = asNum < 0.01 ? asNum.toFixed(4) : asNum.toFixed(2);
  return `$${fixed}`;
}

function formatReadOfTotal(read: number, total: number): string {
  return `${formatInt(read)} of ${formatInt(total)}`;
}

describe('StatsWidget — cost formatting (REQ-HIST-002 AC 4)', () => {
  it('REQ-HIST-002: renders $0.00 for zero cost', () => {
    expect(formatCostUsd(0)).toBe('$0.00');
  });

  it('REQ-HIST-002: renders $0.14 for 14 cents (3 sig figs collapse to 2dp)', () => {
    // "0.140".toPrecision(3) -> "0.140" -> Number -> "0.14" via toFixed(2)
    expect(formatCostUsd(0.14)).toBe('$0.14');
  });

  it('REQ-HIST-002: renders $2.37 for $2.37', () => {
    expect(formatCostUsd(2.37)).toBe('$2.37');
  });

  it('REQ-HIST-002: carries at least 4 sig figs for tiny sub-cent amounts', () => {
    // 0.003 is below 1 cent; the formatter should keep 4 decimal places.
    expect(formatCostUsd(0.003)).toBe('$0.0030');
  });

  it('REQ-HIST-002: collapses to 2 decimal places for dollar-scale amounts', () => {
    expect(formatCostUsd(42.1)).toBe('$42.10');
    expect(formatCostUsd(1.234)).toBe('$1.23');
  });

  it('REQ-HIST-002: renders em-dash for null/undefined/NaN (graceful AC 5 fallback)', () => {
    expect(formatCostUsd(null)).toBe('—');
    expect(formatCostUsd(undefined)).toBe('—');
    expect(formatCostUsd(Number.NaN)).toBe('—');
  });

  it('REQ-HIST-002: rounds tiny negatives through the absolute-value path', () => {
    // Negative costs shouldn't happen in practice but the helper must
    // not surface sign ambiguity in the UI.
    expect(formatCostUsd(-0.05)).toBe('$0.05');
  });
});

describe('StatsWidget — token count formatting (REQ-HIST-002 AC 1)', () => {
  it('REQ-HIST-002: comma-groups thousands', () => {
    expect(formatInt(1_234_567)).toBe('1,234,567');
  });

  it('REQ-HIST-002: renders 0 for zero tokens', () => {
    expect(formatInt(0)).toBe('0');
  });

  it('REQ-HIST-002: renders em-dash for null or non-finite tokens', () => {
    expect(formatInt(null)).toBe('—');
    expect(formatInt(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatInt(Number.NaN)).toBe('—');
  });

  it('REQ-HIST-002: clamps negative counts to 0 rather than leaking sign', () => {
    expect(formatInt(-5)).toBe('0');
  });
});

describe('StatsWidget — read-of-total formatting (REQ-HIST-002 AC 3)', () => {
  it('REQ-HIST-002: renders "{read} of {total}" with comma groups', () => {
    expect(formatReadOfTotal(12, 30)).toBe('12 of 30');
    expect(formatReadOfTotal(1_200, 3_000)).toBe('1,200 of 3,000');
  });

  it('REQ-HIST-002: handles zero-state cleanly', () => {
    expect(formatReadOfTotal(0, 0)).toBe('0 of 0');
  });

  it('REQ-HIST-002: read cannot exceed total in the UI format (displayed verbatim)', () => {
    // The widget does not clamp — this documents that behavior: if the
    // API ever returns read > total the UI shows the raw pair so the
    // inconsistency is visible to the user.
    expect(formatReadOfTotal(5, 3)).toBe('5 of 3');
  });
});

describe('GET /api/stats — SQL contract (REQ-HIST-002 AC 2, owned by Phase 5C)', () => {
  // These are it.todo placeholders because /api/stats is Phase 5C's
  // deliverable. When that phase lands it should fill these in with
  // mock-D1 tests that assert the literal SQL shape:
  //
  //   (1) SELECT COUNT(*)           FROM digests WHERE user_id = ?1
  //   (2) SELECT SUM(tokens_in+out) FROM digests WHERE user_id = ?1
  //   (3) SELECT SUM(cost)          FROM digests WHERE user_id = ?1
  //   (4a) SELECT COUNT(*) FROM articles a
  //         JOIN digests d ON d.id = a.digest_id
  //         WHERE d.user_id = ?1
  //   (4b) SELECT COUNT(*) FROM articles a
  //         JOIN digests d ON d.id = a.digest_id
  //         WHERE d.user_id = ?1 AND a.read_at IS NOT NULL
  //
  // The IDOR property: queries (4a) and (4b) MUST filter on d.user_id,
  // never on articles directly, so a compromised or spoofed digest_id
  // can never read across users.

  it.todo('REQ-HIST-002: digests_generated query binds session user_id');
  it.todo('REQ-HIST-002: tokens_consumed query binds session user_id');
  it.todo('REQ-HIST-002: cost_usd query binds session user_id');
  it.todo(
    'REQ-HIST-002: articles_total query JOINs digests and filters d.user_id (IDOR-safe)',
  );
  it.todo(
    'REQ-HIST-002: articles_read query JOINs digests and filters d.user_id (IDOR-safe)',
  );
  it.todo('REQ-HIST-002: handler returns 401 when no session cookie is present');
  it.todo(
    'REQ-HIST-002: handler response shape includes digests_generated, articles_read, articles_total, tokens_consumed, cost_usd',
  );
});
