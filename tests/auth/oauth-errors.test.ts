// Tests for src/lib/oauth-errors.ts — REQ-AUTH-004 (OAuth error
// allowlist and sanitization).

import { describe, it, expect } from 'vitest';
import {
  OAUTH_ERROR_CODES,
  mapOAuthError,
  isKnownOAuthErrorCode,
} from '~/lib/oauth-errors';

describe('OAUTH_ERROR_CODES', () => {
  it('REQ-AUTH-004: enumerates exactly the four allowlisted codes', () => {
    expect(OAUTH_ERROR_CODES).toEqual([
      'access_denied',
      'no_verified_email',
      'invalid_state',
      'oauth_error',
    ]);
  });
});

describe('mapOAuthError', () => {
  it('REQ-AUTH-004: passes through access_denied', () => {
    expect(mapOAuthError('access_denied')).toBe('access_denied');
  });

  it('REQ-AUTH-004: passes through no_verified_email', () => {
    expect(mapOAuthError('no_verified_email')).toBe('no_verified_email');
  });

  it('REQ-AUTH-004: passes through invalid_state', () => {
    expect(mapOAuthError('invalid_state')).toBe('invalid_state');
  });

  it('REQ-AUTH-004: collapses unknown codes to oauth_error', () => {
    expect(mapOAuthError('redirect_uri_mismatch')).toBe('oauth_error');
    expect(mapOAuthError('application_suspended')).toBe('oauth_error');
    expect(mapOAuthError('bad_verification_code')).toBe('oauth_error');
  });

  it('REQ-AUTH-004: collapses null/undefined/empty to oauth_error', () => {
    expect(mapOAuthError(null)).toBe('oauth_error');
    expect(mapOAuthError(undefined)).toBe('oauth_error');
    expect(mapOAuthError('')).toBe('oauth_error');
  });

  it('REQ-AUTH-004: does not reflect attacker-controlled strings (no prefix match)', () => {
    expect(mapOAuthError('access_denied<script>')).toBe('oauth_error');
    expect(mapOAuthError('invalid_state;xss')).toBe('oauth_error');
    expect(mapOAuthError('ACCESS_DENIED')).toBe('oauth_error'); // case-sensitive
  });
});

describe('isKnownOAuthErrorCode', () => {
  it('REQ-AUTH-004: true for each allowlisted code', () => {
    for (const code of OAUTH_ERROR_CODES) {
      expect(isKnownOAuthErrorCode(code)).toBe(true);
    }
  });

  it('REQ-AUTH-004: false for unknown strings and non-strings', () => {
    expect(isKnownOAuthErrorCode('nope')).toBe(false);
    expect(isKnownOAuthErrorCode(null)).toBe(false);
    expect(isKnownOAuthErrorCode(undefined)).toBe(false);
    expect(isKnownOAuthErrorCode(42)).toBe(false);
    expect(isKnownOAuthErrorCode({})).toBe(false);
  });
});
