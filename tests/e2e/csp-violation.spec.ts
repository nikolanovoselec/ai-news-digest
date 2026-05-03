// Implements REQ-OPS-003
//
// Live-site Playwright suite that asserts the tightened CSP (CF-014)
// fires zero `securitypolicyviolation` events across the core
// navigation flow. This is the merge gate for any CSP change.
//
// Why this exists: Astro 5.x has historically interacted badly with
// strict CSPs on this project. The card-interactions regression that
// produced REQ-STAR-001's e2e test was caused by an inline script tag
// that only fails in a real browser under the deployed CSP — a unit
// test trivially passes the imported-module behaviour. The same
// failure mode applies to view-transitions, FLIP animations, and
// any DOM-touching component. This spec walks the routes most likely
// to surface a violation and fails loudly with the directive name.

import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface StorageStateShape {
  cookies: { name: string; value: string }[];
}

function hasAuthCookies(): boolean {
  try {
    const raw = readFileSync('.playwright/storageState.json', 'utf8');
    const parsed = JSON.parse(raw) as StorageStateShape;
    return Array.isArray(parsed.cookies) && parsed.cookies.length > 0;
  } catch {
    return false;
  }
}

test.beforeAll(() => {
  test.skip(
    !hasAuthCookies(),
    'PLAYWRIGHT_DEV_BYPASS_TOKEN not set — global-setup wrote an empty storageState.',
  );
});

test.describe('REQ-OPS-003 CSP violation gate', () => {
  test('zero securitypolicyviolation events across /digest navigation flow', async ({ page }) => {
    const violations: Array<{
      directive: string;
      blocked: string;
      source: string;
    }> = [];

    // Subscribe BEFORE navigation so we don't miss violations that
    // fire during initial parse. The console listener also catches
    // the older Chrome string format that doesn't fire the event.
    await page.addInitScript(() => {
      window.addEventListener('securitypolicyviolation', (e) => {
        const ev = e as SecurityPolicyViolationEvent;
        // Stash on window so the test can read it back via evaluate().
        const w = window as unknown as { __cspViolations?: unknown[] };
        if (!w.__cspViolations) w.__cspViolations = [];
        w.__cspViolations.push({
          directive: ev.violatedDirective,
          blocked: ev.blockedURI,
          source: ev.sourceFile ?? '',
        });
      });
    });
    page.on('console', (msg) => {
      const txt = msg.text();
      if (txt.includes('Content Security Policy')) {
        violations.push({
          directive: '(console)',
          blocked: '',
          source: txt.slice(0, 200),
        });
      }
    });

    // Walk the high-value navigation paths: dashboard load, article
    // detail, view-transition back, view-transition forward.
    await page.goto('/digest', { waitUntil: 'networkidle' });
    const firstCard = page.locator('[data-article-id]').first();
    await expect(firstCard).toBeVisible();
    const articleHref = await firstCard
      .locator('a[href^="/digest/"]')
      .first()
      .getAttribute('href');
    if (articleHref !== null && articleHref !== '') {
      await page.goto(articleHref, { waitUntil: 'networkidle' });
      await page.goBack({ waitUntil: 'networkidle' });
      await page.goForward({ waitUntil: 'networkidle' });
    }

    const eventViolations = await page.evaluate(() => {
      const w = window as unknown as { __cspViolations?: unknown[] };
      return w.__cspViolations ?? [];
    });
    const all = [...violations, ...eventViolations];

    expect(
      all,
      `CSP violations during navigation flow: ${JSON.stringify(all, null, 2)}`,
    ).toEqual([]);
  });
});
