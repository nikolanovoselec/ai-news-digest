// Tests for the queue dispatcher in src/worker.ts — env-suffix
// stripping (`-(integration|staging)$`) so the same handler routes
// production AND integration queue messages. The 48h integration
// outage on 2026-05-04/05 was caused by the original switch matching
// only bare names; this test pins the new contract.
//
// Implements REQ-PIPE-001.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy on the consumer modules BEFORE importing worker.ts so the
// dispatcher routes to the mocks. Each handler is a vi.fn that records
// invocation; the test asserts on which mock was called per queue name.
const mockHandleCoordinator = vi.fn().mockResolvedValue(undefined);
const mockHandleChunks = vi.fn().mockResolvedValue(undefined);
const mockHandleFinalize = vi.fn().mockResolvedValue(undefined);
const mockLog = vi.fn();

vi.mock('~/queue/scrape-coordinator', () => ({
  handleCoordinatorBatch: mockHandleCoordinator,
}));
vi.mock('~/queue/scrape-chunk-consumer', () => ({
  handleChunkBatch: mockHandleChunks,
}));
vi.mock('~/queue/scrape-finalize-consumer', () => ({
  handleFinalizeBatch: mockHandleFinalize,
}));
vi.mock('~/lib/log', () => ({ log: mockLog }));

import { queue } from '~/worker';

function makeBatch(queueName: string): MessageBatch<unknown> {
  return {
    queue: queueName,
    messages: [],
    ackAll: vi.fn(),
    retryAll: vi.fn(),
  } as unknown as MessageBatch<unknown>;
}

const fakeEnv = {} as unknown as Parameters<typeof queue>[1];
const fakeCtx = {} as unknown as ExecutionContext;

describe('queue dispatcher — env-suffix stripping (REQ-PIPE-001)', () => {
  beforeEach(() => {
    mockHandleCoordinator.mockClear();
    mockHandleChunks.mockClear();
    mockHandleFinalize.mockClear();
    mockLog.mockClear();
  });

  it('REQ-PIPE-001: bare scrape-coordinator routes to handleCoordinatorBatch', async () => {
    await queue(makeBatch('scrape-coordinator'), fakeEnv, fakeCtx);
    expect(mockHandleCoordinator).toHaveBeenCalledTimes(1);
    expect(mockHandleChunks).not.toHaveBeenCalled();
    expect(mockHandleFinalize).not.toHaveBeenCalled();
  });

  it('REQ-PIPE-001: scrape-coordinator-integration routes to handleCoordinatorBatch (integration env)', async () => {
    await queue(makeBatch('scrape-coordinator-integration'), fakeEnv, fakeCtx);
    expect(mockHandleCoordinator).toHaveBeenCalledTimes(1);
  });

  it('REQ-PIPE-001: scrape-coordinator-staging routes to handleCoordinatorBatch (staging env)', async () => {
    await queue(makeBatch('scrape-coordinator-staging'), fakeEnv, fakeCtx);
    expect(mockHandleCoordinator).toHaveBeenCalledTimes(1);
  });

  it('REQ-PIPE-001: scrape-chunks-integration routes to handleChunkBatch', async () => {
    await queue(makeBatch('scrape-chunks-integration'), fakeEnv, fakeCtx);
    expect(mockHandleChunks).toHaveBeenCalledTimes(1);
    expect(mockHandleCoordinator).not.toHaveBeenCalled();
  });

  it('REQ-PIPE-001: scrape-finalize-integration routes to handleFinalizeBatch', async () => {
    await queue(makeBatch('scrape-finalize-integration'), fakeEnv, fakeCtx);
    expect(mockHandleFinalize).toHaveBeenCalledTimes(1);
  });

  it('REQ-PIPE-001: unknown bare queue name hits the default branch and logs unknown_queue', async () => {
    await queue(makeBatch('unknown-queue'), fakeEnv, fakeCtx);
    expect(mockHandleCoordinator).not.toHaveBeenCalled();
    expect(mockHandleChunks).not.toHaveBeenCalled();
    expect(mockHandleFinalize).not.toHaveBeenCalled();
    const unknownCall = mockLog.mock.calls.find(
      (args) => args[1] === 'digest.generation' && args[2]?.status === 'unknown_queue',
    );
    expect(unknownCall).toBeDefined();
    expect(unknownCall?.[2].queue).toBe('unknown-queue');
  });

  it('REQ-PIPE-001: scrape-coordinator-foo (unrecognised suffix) hits the default branch — regex is anchored to integration|staging only', async () => {
    await queue(makeBatch('scrape-coordinator-foo'), fakeEnv, fakeCtx);
    expect(mockHandleCoordinator).not.toHaveBeenCalled();
    const unknownCall = mockLog.mock.calls.find(
      (args) => args[1] === 'digest.generation' && args[2]?.status === 'unknown_queue',
    );
    expect(unknownCall).toBeDefined();
  });
});
