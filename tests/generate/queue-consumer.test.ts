// Tests for src/queue/digest-consumer.ts — REQ-GEN-001, REQ-GEN-002.
//
// The consumer loads the user from D1, invokes a pluggable
// generateDigest function, and acks/retries per the Queue retry
// contract. We inject a `vi.fn()` stub in place of the real pipeline
// so we can assert on arguments and force failure paths without
// touching the module system.

import { describe, it, expect, vi } from 'vitest';
import { handleQueueBatch, processDigestJob } from '~/queue/digest-consumer';
import type { GenerateDigestFn } from '~/queue/digest-consumer';

interface UserRow {
  id: string;
  email: string;
  gh_login: string;
  tz: string;
  digest_hour: number | null;
  digest_minute: number;
  hashtags_json: string | null;
  model_id: string | null;
  email_enabled: number;
  session_version: number;
}

function makeDb(row: UserRow | null): D1Database {
  const prepare = vi.fn().mockImplementation((_sql: string) => ({
    bind: (..._params: unknown[]) => ({
      first: vi.fn().mockResolvedValue(row),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    }),
  }));
  return { prepare } as unknown as D1Database;
}

function makeEnv(db: D1Database): Env {
  return {
    DB: db,
    KV: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as KVNamespace,
    DIGEST_JOBS: { send: vi.fn(), sendBatch: vi.fn() } as unknown as Queue<unknown>,
    AI: { run: vi.fn() } as unknown as Ai,
    ASSETS: {} as Fetcher,
    OAUTH_CLIENT_ID: 'x',
    OAUTH_CLIENT_SECRET: 'x',
    OAUTH_JWT_SECRET: 'x',
    RESEND_API_KEY: 'x',
    RESEND_FROM: 'x',
    APP_URL: 'https://test.example.com',
  } as unknown as Env;
}

function baseRow(): UserRow {
  return {
    id: 'user-1',
    email: 'a@b.c',
    gh_login: 'alice',
    tz: 'UTC',
    digest_hour: 8,
    digest_minute: 0,
    hashtags_json: JSON.stringify(['ai']),
    model_id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    email_enabled: 1,
    session_version: 1,
  };
}

function makeMessage(body: unknown): {
  body: unknown;
  id: string;
  timestamp: Date;
  attempts: number;
  ack: ReturnType<typeof vi.fn>;
  retry: ReturnType<typeof vi.fn>;
} {
  return {
    body,
    id: 'msg-1',
    timestamp: new Date(),
    attempts: 1,
    ack: vi.fn(),
    retry: vi.fn(),
  };
}

/** Build a mock generate fn + keep a typed reference to the underlying
 * vi.fn so we can assert on .mock.calls without casting. */
function makeGenerate(): {
  fn: GenerateDigestFn;
  mock: ReturnType<typeof vi.fn>;
} {
  const mock = vi.fn();
  return { fn: mock as unknown as GenerateDigestFn, mock };
}

describe('processDigestJob', () => {
  it('REQ-GEN-001: calls generateDigest with the user loaded from D1 and the trigger', async () => {
    const { fn, mock } = makeGenerate();
    mock.mockResolvedValue({ digestId: 'd1', status: 'ready' });
    const env = makeEnv(makeDb(baseRow()));

    await processDigestJob(
      env,
      { trigger: 'scheduled', user_id: 'user-1', local_date: '2026-04-22' },
      fn,
    );

    expect(mock).toHaveBeenCalledTimes(1);
    const args = mock.mock.calls[0]!;
    expect(args[0]).toBe(env);
    expect(args[1]).toMatchObject({ id: 'user-1', tz: 'UTC' });
    expect(args[2]).toBe('scheduled');
    expect(args[3]).toBeUndefined();
  });

  it('REQ-GEN-002: manual trigger passes digest_id to generateDigest', async () => {
    const { fn, mock } = makeGenerate();
    mock.mockResolvedValue({ digestId: 'd2', status: 'ready' });
    const env = makeEnv(makeDb(baseRow()));

    await processDigestJob(
      env,
      {
        trigger: 'manual',
        user_id: 'user-1',
        local_date: '2026-04-22',
        digest_id: 'd2',
      },
      fn,
    );

    const args = mock.mock.calls[0]!;
    expect(args[2]).toBe('manual');
    expect(args[3]).toBe('d2');
  });

  it('REQ-GEN-001: malformed payload swallowed (no throw, no generate call)', async () => {
    const { fn, mock } = makeGenerate();
    const env = makeEnv(makeDb(baseRow()));

    await expect(
      processDigestJob(env, { trigger: 'whatever' }, fn),
    ).resolves.toBeUndefined();
    expect(mock).not.toHaveBeenCalled();
  });

  it('REQ-GEN-001: user not found → no generate call, no throw', async () => {
    const { fn, mock } = makeGenerate();
    const env = makeEnv(makeDb(null));

    await expect(
      processDigestJob(
        env,
        { trigger: 'scheduled', user_id: 'ghost', local_date: '2026-04-22' },
        fn,
      ),
    ).resolves.toBeUndefined();
    expect(mock).not.toHaveBeenCalled();
  });

  it('REQ-GEN-002: processDigestJob returns normally on failed digest (status=failed is terminal)', async () => {
    const { fn, mock } = makeGenerate();
    mock.mockResolvedValue({
      digestId: 'd3',
      status: 'failed',
      error_code: 'llm_failed',
    });
    const env = makeEnv(makeDb(baseRow()));

    await expect(
      processDigestJob(
        env,
        {
          trigger: 'manual',
          user_id: 'user-1',
          local_date: '2026-04-22',
          digest_id: 'd3',
        },
        fn,
      ),
    ).resolves.toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('REQ-GEN-001/002: generateDigest throwing propagates so Queue retries', async () => {
    const { fn, mock } = makeGenerate();
    mock.mockRejectedValue(new Error('deep boom'));
    const env = makeEnv(makeDb(baseRow()));

    await expect(
      processDigestJob(
        env,
        { trigger: 'scheduled', user_id: 'user-1', local_date: '2026-04-22' },
        fn,
      ),
    ).rejects.toThrow(/deep boom/);
  });
});

describe('handleQueueBatch', () => {
  it('REQ-GEN-001: each successful message is acked', async () => {
    const { fn, mock } = makeGenerate();
    mock.mockResolvedValue({ digestId: 'd1', status: 'ready' });
    const env = makeEnv(makeDb(baseRow()));
    const msg = makeMessage({
      trigger: 'scheduled',
      user_id: 'user-1',
      local_date: '2026-04-22',
    });

    await handleQueueBatch(
      { messages: [msg] } as unknown as Parameters<typeof handleQueueBatch>[0],
      env,
      fn,
    );
    expect(msg.ack).toHaveBeenCalledTimes(1);
    expect(msg.retry).not.toHaveBeenCalled();
  });

  it('REQ-GEN-001: a throwing generateDigest results in retry(), not ack()', async () => {
    const { fn, mock } = makeGenerate();
    mock.mockRejectedValue(new Error('boom'));
    const env = makeEnv(makeDb(baseRow()));
    const msg = makeMessage({
      trigger: 'scheduled',
      user_id: 'user-1',
      local_date: '2026-04-22',
    });

    await handleQueueBatch(
      { messages: [msg] } as unknown as Parameters<typeof handleQueueBatch>[0],
      env,
      fn,
    );
    expect(msg.ack).not.toHaveBeenCalled();
    expect(msg.retry).toHaveBeenCalledTimes(1);
  });

  it('REQ-GEN-001: one failing message does not block other messages in the batch', async () => {
    const { fn, mock } = makeGenerate();
    mock
      .mockRejectedValueOnce(new Error('first boom'))
      .mockResolvedValueOnce({ digestId: 'd2', status: 'ready' });
    const env = makeEnv(makeDb(baseRow()));
    const msg1 = makeMessage({
      trigger: 'scheduled',
      user_id: 'user-1',
      local_date: '2026-04-22',
    });
    const msg2 = makeMessage({
      trigger: 'scheduled',
      user_id: 'user-1',
      local_date: '2026-04-22',
    });

    await handleQueueBatch(
      { messages: [msg1, msg2] } as unknown as Parameters<typeof handleQueueBatch>[0],
      env,
      fn,
    );
    expect(msg1.retry).toHaveBeenCalledTimes(1);
    expect(msg2.ack).toHaveBeenCalledTimes(1);
  });
});
