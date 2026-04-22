// Tests for src/lib/log.ts — REQ-OPS-001 (structured JSON logging).
// Verifies the log helper emits valid JSON via console.log with the required
// envelope fields (ts, level, event) and merges caller-supplied fields.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, type LogEvent, type LogLevel } from '~/lib/log';

describe('log', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function parseSingleEmission(): Record<string, unknown> {
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const raw = consoleSpy.mock.calls[0]?.[0];
    expect(typeof raw).toBe('string');
    return JSON.parse(raw as string) as Record<string, unknown>;
  }

  it('REQ-OPS-001: emits exactly one console.log call per invocation', () => {
    log('info', 'auth.login');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('REQ-OPS-001: emits a valid JSON string (parses without throwing)', () => {
    log('info', 'auth.login', { user_id: 'u1' });
    const raw = consoleSpy.mock.calls[0]?.[0];
    expect(() => JSON.parse(raw as string)).not.toThrow();
  });

  it('REQ-OPS-001: always carries ts, level, event envelope fields', () => {
    log('info', 'auth.login');
    const record = parseSingleEmission();
    expect(record).toHaveProperty('ts');
    expect(record).toHaveProperty('level');
    expect(record).toHaveProperty('event');
  });

  it('REQ-OPS-001: ts is a unix millisecond timestamp (number near Date.now())', () => {
    const before = Date.now();
    log('info', 'auth.login');
    const after = Date.now();
    const record = parseSingleEmission();
    expect(typeof record.ts).toBe('number');
    expect(record.ts as number).toBeGreaterThanOrEqual(before);
    expect(record.ts as number).toBeLessThanOrEqual(after);
  });

  it('REQ-OPS-001: level and event are preserved verbatim', () => {
    log('warn', 'source.fetch.failed');
    const record = parseSingleEmission();
    expect(record.level).toBe('warn');
    expect(record.event).toBe('source.fetch.failed');
  });

  it('REQ-OPS-001: merges extra fields into the record alongside the envelope', () => {
    log('error', 'email.send.failed', {
      user_id: 'user-123',
      digest_id: 'dg-456',
      attempt: 2,
    });
    const record = parseSingleEmission();
    expect(record.user_id).toBe('user-123');
    expect(record.digest_id).toBe('dg-456');
    expect(record.attempt).toBe(2);
  });

  it('REQ-OPS-001: envelope fields win over caller-supplied overrides', () => {
    // A careless caller who passes `level: 'info'` in fields while calling
    // with level: 'error' MUST NOT be able to mislabel the record.
    log('error', 'digest.generation', {
      level: 'info',
      event: 'auth.login',
      ts: 0,
    });
    const record = parseSingleEmission();
    expect(record.level).toBe('error');
    expect(record.event).toBe('digest.generation');
    expect(record.ts).not.toBe(0);
    expect(typeof record.ts).toBe('number');
  });

  it('REQ-OPS-001: accepts every documented LogLevel value', () => {
    const levels: LogLevel[] = ['info', 'warn', 'error'];
    for (const level of levels) {
      consoleSpy.mockClear();
      log(level, 'auth.login');
      const record = parseSingleEmission();
      expect(record.level).toBe(level);
    }
  });

  it('REQ-OPS-001: accepts every documented LogEvent value', () => {
    const events: LogEvent[] = [
      'auth.login',
      'digest.generation',
      'source.fetch.failed',
      'refresh.rejected',
      'email.send.failed',
      'discovery.completed',
    ];
    for (const event of events) {
      consoleSpy.mockClear();
      log('info', event);
      const record = parseSingleEmission();
      expect(record.event).toBe(event);
    }
  });

  it('REQ-OPS-001: supports arbitrary structured payloads (nested objects, arrays)', () => {
    log('info', 'discovery.completed', {
      hashtags: ['react', 'typescript'],
      result: { feeds_found: 7, cached: false },
    });
    const record = parseSingleEmission();
    expect(record.hashtags).toEqual(['react', 'typescript']);
    expect(record.result).toEqual({ feeds_found: 7, cached: false });
  });

  it('REQ-OPS-001: omitting fields argument still produces a valid record', () => {
    log('info', 'auth.login');
    const record = parseSingleEmission();
    // The only keys should be the envelope.
    expect(Object.keys(record).sort()).toEqual(['event', 'level', 'ts']);
  });
});
