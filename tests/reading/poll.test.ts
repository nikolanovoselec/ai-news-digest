// Tests for src/scripts/digest-poll.ts — REQ-READ-004.
//
// The poll module is pure TypeScript with all browser globals injected
// as dependencies, so we can exercise every branch (keep polling, stop
// on ready, stop on failed, transient error handling) without a JSDOM
// or real setTimeout.

import { describe, it, expect, vi } from 'vitest';
import {
  pollOnce,
  pollLoop,
  POLL_INTERVAL_MS,
} from '~/scripts/digest-poll';

/** Thin fetch stub: returns a canned Response body sequentially. */
function makeFetch(
  responses: Array<{ ok: boolean; body?: unknown; throws?: boolean }>,
): typeof fetch {
  let i = 0;
  return (async () => {
    const entry = responses[i] ?? responses[responses.length - 1]!;
    i++;
    if (entry.throws === true) throw new Error('network');
    return {
      ok: entry.ok,
      json: async () => entry.body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('pollOnce', () => {
  it('REQ-READ-004: returns ready when body.digest.status is ready', async () => {
    const fetchImpl = makeFetch([
      { ok: true, body: { digest: { id: 'd1', status: 'ready' } } },
    ]);
    const result = await pollOnce('d1', fetchImpl);
    expect(result.status).toBe('ready');
    expect(result.errorCode).toBeNull();
  });

  it('REQ-READ-004: returns failed with error_code propagated', async () => {
    const fetchImpl = makeFetch([
      {
        ok: true,
        body: { digest: { id: 'd1', status: 'failed', error_code: 'llm_failed' } },
      },
    ]);
    const result = await pollOnce('d1', fetchImpl);
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('llm_failed');
  });

  it('REQ-READ-004: treats transient HTTP failure as in_progress so loop continues', async () => {
    const fetchImpl = makeFetch([{ ok: false }]);
    const result = await pollOnce('d1', fetchImpl);
    expect(result.status).toBe('in_progress');
  });

  it('REQ-READ-004: treats network throw as in_progress', async () => {
    const fetchImpl = makeFetch([{ throws: true }]);
    const result = await pollOnce('d1', fetchImpl);
    expect(result.status).toBe('in_progress');
  });

  it('REQ-READ-004: treats unknown status string as in_progress (not a false ready)', async () => {
    const fetchImpl = makeFetch([
      { ok: true, body: { digest: { id: 'd1', status: 'weird' } } },
    ]);
    const result = await pollOnce('d1', fetchImpl);
    expect(result.status).toBe('in_progress');
  });
});

describe('pollLoop', () => {
  /**
   * Scheduler that records setTimeout/clearTimeout calls and gives the
   * test explicit control over when timer callbacks fire.
   */
  function makeScheduler(): {
    setTimeoutImpl: (cb: () => void, ms: number) => unknown;
    clearTimeoutImpl: (h: unknown) => void;
    runNext: () => Promise<void>;
    scheduled: Array<{ cb: () => void; ms: number; cleared: boolean }>;
  } {
    const scheduled: Array<{ cb: () => void; ms: number; cleared: boolean }> = [];
    return {
      setTimeoutImpl: (cb, ms) => {
        const entry = { cb, ms, cleared: false };
        scheduled.push(entry);
        return entry;
      },
      clearTimeoutImpl: (h) => {
        const entry = h as { cleared: boolean };
        entry.cleared = true;
      },
      runNext: async () => {
        // Find the first non-cleared entry and run it.
        const entry = scheduled.find((e) => !e.cleared);
        if (entry !== undefined) {
          entry.cleared = true;
          entry.cb();
          // Flush enough microtasks for the async step() body (awaits
          // fetchImpl, then res.json(), then onReady/onFailed/setTimeout)
          // to complete.
          for (let i = 0; i < 10; i++) {
            await Promise.resolve();
          }
        }
      },
      scheduled,
    };
  }

  it('REQ-READ-004: schedules the first tick at POLL_INTERVAL_MS', () => {
    const scheduler = makeScheduler();
    const onReady = vi.fn();
    const onFailed = vi.fn();
    pollLoop('d1', {
      fetchImpl: makeFetch([{ ok: true, body: { digest: { id: 'd1', status: 'in_progress' } } }]),
      setTimeoutImpl: scheduler.setTimeoutImpl,
      clearTimeoutImpl: scheduler.clearTimeoutImpl,
      onReady,
      onFailed,
    });
    expect(scheduler.scheduled).toHaveLength(1);
    expect(scheduler.scheduled[0]!.ms).toBe(POLL_INTERVAL_MS);
  });

  it('REQ-READ-004: polls every 5s while in_progress', async () => {
    const scheduler = makeScheduler();
    const onReady = vi.fn();
    const onFailed = vi.fn();
    pollLoop('d1', {
      fetchImpl: makeFetch([
        { ok: true, body: { digest: { id: 'd1', status: 'in_progress' } } },
        { ok: true, body: { digest: { id: 'd1', status: 'in_progress' } } },
      ]),
      setTimeoutImpl: scheduler.setTimeoutImpl,
      clearTimeoutImpl: scheduler.clearTimeoutImpl,
      onReady,
      onFailed,
    });
    await scheduler.runNext();
    // After the first poll returns in_progress, a fresh 5s tick is scheduled.
    const active = scheduler.scheduled.filter((e) => !e.cleared);
    expect(active).toHaveLength(1);
    expect(active[0]!.ms).toBe(POLL_INTERVAL_MS);
    expect(onReady).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('REQ-READ-004: stops polling on ready', async () => {
    const scheduler = makeScheduler();
    const onReady = vi.fn();
    const onFailed = vi.fn();
    pollLoop('d1', {
      fetchImpl: makeFetch([{ ok: true, body: { digest: { id: 'd1', status: 'ready' } } }]),
      setTimeoutImpl: scheduler.setTimeoutImpl,
      clearTimeoutImpl: scheduler.clearTimeoutImpl,
      onReady,
      onFailed,
    });
    await scheduler.runNext();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
    // No additional tick scheduled after ready.
    const active = scheduler.scheduled.filter((e) => !e.cleared);
    expect(active).toHaveLength(0);
  });

  it('REQ-READ-004: stops polling on failed and forwards error_code', async () => {
    const scheduler = makeScheduler();
    const onReady = vi.fn();
    const onFailed = vi.fn();
    pollLoop('d1', {
      fetchImpl: makeFetch([
        {
          ok: true,
          body: {
            digest: { id: 'd1', status: 'failed', error_code: 'all_sources_failed' },
          },
        },
      ]),
      setTimeoutImpl: scheduler.setTimeoutImpl,
      clearTimeoutImpl: scheduler.clearTimeoutImpl,
      onReady,
      onFailed,
    });
    await scheduler.runNext();
    expect(onFailed).toHaveBeenCalledWith('all_sources_failed');
    expect(onReady).not.toHaveBeenCalled();
    const active = scheduler.scheduled.filter((e) => !e.cleared);
    expect(active).toHaveLength(0);
  });

  it('REQ-READ-004: cancel() stops further polling', async () => {
    const scheduler = makeScheduler();
    const onReady = vi.fn();
    const onFailed = vi.fn();
    const cancel = pollLoop('d1', {
      fetchImpl: makeFetch([
        { ok: true, body: { digest: { id: 'd1', status: 'in_progress' } } },
      ]),
      setTimeoutImpl: scheduler.setTimeoutImpl,
      clearTimeoutImpl: scheduler.clearTimeoutImpl,
      onReady,
      onFailed,
    });
    cancel();
    await scheduler.runNext();
    // Even if the scheduled tick fires, the cancelled flag shortcuts
    // the handlers.
    expect(onReady).not.toHaveBeenCalled();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('REQ-READ-004: fetch URL includes the digest id', async () => {
    const scheduler = makeScheduler();
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ digest: { id: 'd42', status: 'in_progress' } }),
      });
    pollLoop('d42', {
      fetchImpl: fetchSpy as unknown as typeof fetch,
      setTimeoutImpl: scheduler.setTimeoutImpl,
      clearTimeoutImpl: scheduler.clearTimeoutImpl,
      onReady: vi.fn(),
      onFailed: vi.fn(),
    });
    await scheduler.runNext();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/digest/d42',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
    );
  });
});
