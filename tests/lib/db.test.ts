// Unit tests for src/lib/db.ts — the two helpers are thin wrappers around
// D1's native methods, so mocked D1 interfaces suffice. Integration against
// a real D1 happens in phase-level tests that exercise the full generation
// pipeline.

import { describe, it, expect, vi } from 'vitest';
import { applyForeignKeysPragma, batch } from '../../src/lib/db';

describe('db.ts', () => {
  it('REQ-DATA-001: applyForeignKeysPragma runs exactly one exec with PRAGMA foreign_keys=ON', async () => {
    const exec = vi.fn().mockResolvedValue(undefined);
    const fakeDb = { exec } as unknown as D1Database;

    await applyForeignKeysPragma(fakeDb);

    expect(exec).toHaveBeenCalledTimes(1);
    const arg = exec.mock.calls[0]?.[0] as string;
    expect(arg).toMatch(/PRAGMA\s+foreign_keys\s*=\s*ON/i);
  });

  it('REQ-DATA-001: batch forwards statements to db.batch and preserves result ordering', async () => {
    const dbBatch = vi.fn().mockResolvedValue([
      { success: true, results: [{ id: 'a' }] },
      { success: true, results: [{ id: 'b' }] }
    ]);
    const fakeDb = { batch: dbBatch } as unknown as D1Database;
    const stmts = [
      { bind: () => ({}) } as unknown as D1PreparedStatement,
      { bind: () => ({}) } as unknown as D1PreparedStatement
    ];

    const out = await batch<{ id: string }>(fakeDb, stmts);

    expect(dbBatch).toHaveBeenCalledTimes(1);
    expect(dbBatch).toHaveBeenCalledWith(stmts);
    expect(out).toHaveLength(2);
    expect(out[0]?.results?.[0]?.id).toBe('a');
    expect(out[1]?.results?.[0]?.id).toBe('b');
  });

  it('REQ-DATA-001: batch propagates D1 errors (no swallowing)', async () => {
    const dbBatch = vi.fn().mockRejectedValue(new Error('D1_ERROR: constraint failed'));
    const fakeDb = { batch: dbBatch } as unknown as D1Database;
    const stmts = [{ bind: () => ({}) } as unknown as D1PreparedStatement];

    await expect(batch(fakeDb, stmts)).rejects.toThrow(/constraint failed/);
  });
});
