// Tests for the install-prompt client behaviour — REQ-PWA-001.
//
// The DOM wiring (beforeinstallprompt listener, click handler, the
// iOS instructional note reveal) is covered by the Playwright spec at
// tests/e2e/install-prompt.spec.ts. This unit suite exercises the
// pure iOS-detection helper extracted into src/lib/ios-detection.ts —
// no `?raw` source imports, no regex on file content.

import { describe, it, expect } from 'vitest';
import { isIos } from '~/lib/ios-detection';

describe('iOS detection (REQ-PWA-001 AC 4)', () => {
  it('REQ-PWA-001: iPhone Safari in browser tab is detected as iOS', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIos({ userAgent: ua, standalone: false })).toBe(true);
  });

  it('REQ-PWA-001: iPad Safari in browser tab is detected as iOS', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIos({ userAgent: ua, standalone: false })).toBe(true);
  });

  it('REQ-PWA-001: iPod touch Safari is detected as iOS', () => {
    const ua = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_4 like Mac OS X)';
    expect(isIos({ userAgent: ua, standalone: false })).toBe(true);
  });

  it('REQ-PWA-001: iPadOS 13+ with desktop UA but touch support is detected as iOS', () => {
    // iPadOS sends a desktop Safari UA but still has touch; the install
    // hint should appear here too. maxTouchPoints > 1 disambiguates from
    // a real Mac.
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
    expect(isIos({ userAgent: ua, standalone: false, maxTouchPoints: 5 })).toBe(true);
  });

  it('REQ-PWA-001: iPhone already installed as PWA (standalone) is not detected as iOS', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIos({ userAgent: ua, standalone: true })).toBe(false);
  });

  it('REQ-PWA-001: Android Chrome is not iOS (uses beforeinstallprompt path)', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';
    expect(isIos({ userAgent: ua, standalone: false })).toBe(false);
  });

  it('REQ-PWA-001: desktop Chrome on macOS is not iOS', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';
    expect(isIos({ userAgent: ua, standalone: false, maxTouchPoints: 0 })).toBe(false);
  });

  it('REQ-PWA-001: real Mac Safari (no touch, no iOS tokens) is not iOS', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
    expect(isIos({ userAgent: ua, standalone: false, maxTouchPoints: 0 })).toBe(false);
  });

  it('REQ-PWA-001: Firefox on Windows is not iOS', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0';
    expect(isIos({ userAgent: ua, standalone: false })).toBe(false);
  });
});
