// REQ-HIST-001 AC2/AC4, REQ-HIST-002 AC2: repair stored cost aggregates.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env, applyD1Migrations } from '../fixtures/cloudflare-test';

const migrations = env.DB_MIGRATIONS as Parameters<typeof applyD1Migrations>[1];
const repairName = '0022_luna_cost_backfill.sql';

async function repair(): Promise<void> {
  // Run the actual migration statements again to verify safe operational retries.
  for (const migration of migrations.filter((entry) => entry.name === repairName)) {
    await env.DB.batch(migration.queries.map((query) => env.DB.prepare(query)));
  }
}

async function costs(): Promise<Record<string, number>> {
  const rows = await env.DB.prepare('SELECT id, estimated_cost_usd FROM scrape_runs').all<{
    id: string; estimated_cost_usd: number;
  }>();
  return Object.fromEntries(rows.results.map((row) => [row.id, row.estimated_cost_usd]));
}

describe('Luna historical cost repair', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations.filter((entry) => entry.name !== repairName));
  });

  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM scrape_runs').run();
    const rows = [
      ['ready', 'openai/gpt-6-luna', 'ready', 1_000_000, 2_000_000, 0],
      ['failed', 'openai/gpt-6-luna', 'failed', 1_000, 2_000, 0],
      ['paid', 'openai/gpt-6-luna', 'ready', 1_000_000, 2_000_000, 0.42],
      ['other', 'google-ai-studio/gemini-2.5-flash-lite', 'ready', 1_000_000, 2_000_000, 0],
      ['unused', 'openai/gpt-6-luna', 'ready', 0, 0, 0],
      ['active', 'openai/gpt-6-luna', 'running', 1_000_000, 2_000_000, 0],
    ] as const;
    await env.DB.batch(rows.map(([id, model, status, input, output, cost]) => env.DB.prepare(
      `INSERT INTO scrape_runs (id, model_id, status, started_at, tokens_in, tokens_out, estimated_cost_usd)
       VALUES (?, ?, ?, 1800000000, ?, ?, ?)`,
    ).bind(id, model, status, input, output, cost)));
  });

  it('REQ-HIST-001 AC2/AC4: restores stored daily cost for completed Luna usage', async () => {
    await repair();
    const result = await costs();
    expect(result['ready']).toBeCloseTo(1.10, 10);
    expect(result['failed']).toBeCloseTo(0.0011, 10);
    const total = await env.DB.prepare(
      `SELECT SUM(estimated_cost_usd) AS cost FROM scrape_runs WHERE started_at = 1800000000`,
    ).first<{ cost: number }>();
    expect(total?.cost).toBeCloseTo(1.5211, 10);
  });

  it('REQ-HIST-002 AC2: preserves existing costs, other models, unused and active runs', async () => {
    await repair();
    const result = await costs();
    expect(result['paid']).toBe(0.42);
    expect(result['other']).toBe(0);
    expect(result['unused']).toBe(0);
    expect(result['active']).toBe(0);
  });

  it('REQ-HIST-002 AC2: retrying the repair does not double count cost or change token usage', async () => {
    await repair();
    const before = await env.DB.prepare(
      'SELECT id, tokens_in, tokens_out, estimated_cost_usd FROM scrape_runs ORDER BY id',
    ).all();
    await repair();
    const after = await env.DB.prepare(
      'SELECT id, tokens_in, tokens_out, estimated_cost_usd FROM scrape_runs ORDER BY id',
    ).all();
    expect(after.results).toEqual(before.results);
  });
});
