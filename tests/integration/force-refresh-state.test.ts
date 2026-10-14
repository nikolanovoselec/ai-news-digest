// REQ-OPS-005: real D1 state and HTTP/queue wire contracts.
// No browser automation, production bindings, or external provider calls.
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { env, applyD1Migrations } from '../fixtures/cloudflare-test';
import { GET, POST } from '~/pages/api/admin/force-refresh';
import { signSession } from '~/lib/session-jwt';
import { SESSION_COOKIE_NAME } from '~/middleware/auth';
import { DEFAULT_MODEL_ID } from '~/lib/models';
import { base64UrlEncode } from '~/lib/crypto';

const APP_URL = 'https://force-refresh.example.invalid';
const SECRET = 'force-refresh-state-test-signing-secret-longer-than-32';
const USER_ID = '__force_refresh_state__';
const ADMIN_EMAIL = 'force-refresh-operator@example.invalid';
const NOW = 1_800_000_000;
type Method = 'GET' | 'POST';
type Run = { id: string; started_at: number; status: string; model_id: string; chunk_count: number };
type Message = { scrape_run_id: string };
let messages: Message[];

async function runs(): Promise<Run[]> {
  const result = await env.DB.prepare(
    'SELECT id, started_at, status, model_id, chunk_count FROM scrape_runs ORDER BY id',
  ).all<Run>();
  return result.results;
}

async function request(method: Method, options: {
  browser?: boolean;
  noSession?: boolean;
  accessAud?: string;
  assertionAud?: string;
  operator?: boolean;
} = {}): Promise<Response> {
  const email = options.operator === false ? 'non-operator@example.invalid' : ADMIN_EMAIL;
  await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, USER_ID).run();
  const headers = new Headers({
    Origin: APP_URL,
    Accept: options.browser ? 'text/html' : 'application/json',
  });
  if (!options.noSession) {
    const jwt = await signSession({ sub: USER_ID, email, ghl: 'fixture', sv: 1 }, SECRET);
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${jwt}`);
  }
  if (options.assertionAud !== undefined) {
    const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
      aud: options.assertionAud,
      exp: NOW + 300,
    })));
    // A test perimeter assertion; the worker validates claims, not its signature.
    headers.set('Cf-Access-Jwt-Assertion', `header.${payload}.signature`);
  }
  const queue = {
    async send(message: Message): Promise<void> {
      // Record the serialized public queue message, not method/mock call counts.
      messages.push(JSON.parse(JSON.stringify(message)) as Message);
    },
    async sendBatch(batch: Array<{ body: Message }>): Promise<void> {
      for (const message of batch) {
        messages.push(JSON.parse(JSON.stringify(message.body)) as Message);
      }
    },
  } as unknown as Queue<Message>;
  const bindings = {
    DB: env.DB,
    APP_URL,
    ADMIN_EMAIL,
    OAUTH_JWT_SECRET: SECRET,
    SCRAPE_COORDINATOR: queue,
    ...(options.accessAud !== undefined ? { CF_ACCESS_AUD: options.accessAud } : {}),
  };
  const incoming = new Request(`${APP_URL}/api/admin/force-refresh`, { method, headers });
  const context = { request: incoming, url: new URL(incoming.url), params: {}, locals: { env: bindings } };
  return (method === 'GET' ? GET : POST)(context as never);
}

async function runId(response: Response, method: Method): Promise<string> {
  if (method === 'POST') {
    expect(response.status).toBe(303);
    const location = response.headers.get('Location');
    expect(location).not.toBeNull();
    return new URL(location!, APP_URL).searchParams.get('run_id')!;
  }
  expect(response.status).toBe(200);
  const body = await response.json() as { ok: boolean; scrape_run_id: string; reused: boolean };
  expect(body.ok).toBe(true);
  return body.scrape_run_id;
}

async function seedRun(age: number): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO scrape_runs (id, model_id, started_at, status, chunk_count) VALUES (?, ?, ?, 'running', 0)",
  ).bind('existing-run', DEFAULT_MODEL_ID, NOW - age).run();
}

describe('REQ-OPS-005: force-refresh persistence and authorization', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.DB_MIGRATIONS ?? []);
    await env.DB.exec('PRAGMA foreign_keys = ON');
  });
  beforeEach(async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
    messages = [];
    await env.DB.prepare('DELETE FROM scrape_runs').run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(USER_ID).run();
    await env.DB.prepare(
      "INSERT INTO users (id, email, gh_login, tz, session_version, created_at) VALUES (?, ?, ?, 'UTC', 1, ?)",
    ).bind(USER_ID, ADMIN_EMAIL, 'fixture', NOW).run();
  });
  afterEach(() => vi.restoreAllMocks());

  it.each<Method>(['GET', 'POST'])('AC1/AC2: %s persists a running run and dispatches its queue envelope', async (method) => {
    const response = await request(method);
    if (method === 'GET') {
      expect(await response.clone().json()).toMatchObject({ ok: true, reused: false });
    }
    const id = await runId(response, method);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(await runs()).toEqual([{
      id, started_at: NOW, status: 'running', model_id: DEFAULT_MODEL_ID, chunk_count: 0,
    }]);
    expect(messages).toEqual([{ scrape_run_id: id }]);
  });

  it.each<Method>(['GET', 'POST'])('AC3: %s reuses a run exactly at the 120-second boundary', async (method) => {
    await seedRun(120);
    const id = await runId(await request(method), method);
    expect(id).toBe('existing-run');
    expect(await runs()).toEqual([{
      id: 'existing-run', started_at: NOW - 120, status: 'running', model_id: DEFAULT_MODEL_ID, chunk_count: 0,
    }]);
    expect(messages).toEqual([]);
  });

  it.each<Method>(['GET', 'POST'])('AC3: %s starts a new run when the existing run is older than 120 seconds', async (method) => {
    await seedRun(121);
    const id = await runId(await request(method), method);
    expect(id).not.toBe('existing-run');
    const stored = await runs();
    expect(stored).toHaveLength(2);
    expect(stored.find((row) => row.id === id)).toEqual({
      id, started_at: NOW, status: 'running', model_id: DEFAULT_MODEL_ID, chunk_count: 0,
    });
    expect(messages).toEqual([{ scrape_run_id: id }]);
  });

  it('AC3: repeated clicks return the same persisted run without another dispatch', async () => {
    const first = await runId(await request('POST'), 'POST');
    const second = await runId(await request('GET'), 'GET');
    expect(second).toBe(first);
    expect(await runs()).toHaveLength(1);
    expect(messages).toEqual([{ scrape_run_id: first }]);
  });

  it('AC4: browser GET redirects to settings with the persisted run identifier', async () => {
    const response = await request('GET', { browser: true });
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get('Location')!, APP_URL);
    expect(location.pathname).toBe('/settings');
    expect(location.searchParams.get('force_refresh')).toBe('ok');
    expect(location.searchParams.get('run_id')).toBe((await runs())[0]?.id);
  });

  it('AC4: scripted GET reports the persisted identifier and reuse flag as JSON', async () => {
    await seedRun(30);
    const response = await request('GET');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ ok: true, scrape_run_id: 'existing-run', reused: true });
    expect(messages).toEqual([]);
  });

  it.each<Method>(['GET', 'POST'])('AC5: %s denies absent sessions without persisting or dispatching', async (method) => {
    expect((await request(method, { noSession: true })).status).toBe(401);
    expect(await runs()).toEqual([]);
    expect(messages).toEqual([]);
  });

  it.each<Method>(['GET', 'POST'])('AC5: %s denies non-operators without persisting or dispatching', async (method) => {
    expect((await request(method, { operator: false })).status).toBe(403);
    expect(await runs()).toEqual([]);
    expect(messages).toEqual([]);
  });

  it.each<Method>(['GET', 'POST'])('AC6: %s requires the configured Access audience before side effects', async (method) => {
    expect((await request(method, { accessAud: 'expected' })).status).toBe(401);
    expect((await request(method, { accessAud: 'expected', assertionAud: 'wrong' })).status).toBe(401);
    expect(await runs()).toEqual([]);
    expect(messages).toEqual([]);
    const id = await runId(await request(method, { accessAud: 'expected', assertionAud: 'expected' }), method);
    expect(messages).toEqual([{ scrape_run_id: id }]);
    expect((await runs())[0]?.id).toBe(id);
  });
});
