// Tests for src/pages/digest.astro and its associated components —
// REQ-READ-001, REQ-READ-004, REQ-READ-005.
//
// Astro pages can't be fully rendered in a vitest worker without the
// full Astro runtime, so we validate observable contract via `?raw`
// source imports (same pattern used in install-prompt.test.ts). The
// tests assert on the DOM hooks, class names, animation rules, and
// branch conditions that the client script + CSS rely on.

import { describe, it, expect } from 'vitest';

import digestPageSource from '../../src/pages/digest.astro?raw';
import digestCardSource from '../../src/components/DigestCard.astro?raw';
import skeletonSource from '../../src/components/LoadingSkeleton.astro?raw';
import pendingBannerSource from '../../src/components/PendingBanner.astro?raw';

describe('digest.astro — REQ-READ-001 grid', () => {
  it('REQ-READ-001: implements REQ-READ-001 marker is present', () => {
    expect(digestPageSource).toContain('REQ-READ-001');
  });

  it('REQ-READ-001: responsive grid uses 1/2/3 columns at 640/768/1024 breakpoints', () => {
    // AC 1 — mobile default is 1 column.
    expect(digestPageSource).toMatch(/grid-template-columns:\s*1fr/);
    // Tablet breakpoint — 2 columns at 768px.
    expect(digestPageSource).toMatch(
      /@media\s*\(min-width:\s*768px\)[\s\S]*?grid-template-columns:\s*repeat\(2/,
    );
    // Desktop breakpoint — 3 columns at 1024px.
    expect(digestPageSource).toMatch(
      /@media\s*\(min-width:\s*1024px\)[\s\S]*?grid-template-columns:\s*repeat\(3/,
    );
  });

  it('REQ-READ-001: renders exactly 10 skeleton cards in the live state', () => {
    // Array.from({ length: 10 }) is the only place skeletons originate.
    expect(digestPageSource).toMatch(/Array\.from\(\s*\{\s*length:\s*10\s*\}\s*\)/);
  });

  it('REQ-READ-001: Refresh button is disabled while live', () => {
    expect(digestPageSource).toContain('disabled={isLive}');
  });

  it('REQ-READ-001: iterates articles with index so stagger delay is per-card', () => {
    // Passing index to DigestCard is the mechanism that drives the
    // 40ms-per-card animation-delay.
    expect(digestPageSource).toMatch(/index=\{i\}/);
  });
});

describe('DigestCard.astro — REQ-READ-001 AC 2/3', () => {
  it('REQ-READ-001: shows title, one-liner, and source badge', () => {
    expect(digestCardSource).toContain('digest-card__title');
    expect(digestCardSource).toContain('digest-card__one-liner');
    expect(digestCardSource).toContain('digest-card__source');
  });

  it('REQ-READ-001: applies 40ms-per-index stagger capped at 9', () => {
    expect(digestCardSource).toContain('stagger * 40');
    expect(digestCardSource).toMatch(/Math\.min\(index,\s*9\)/);
  });

  it('REQ-READ-001: wraps in <a href> so whole card is clickable', () => {
    expect(digestCardSource).toMatch(/<a[\s\S]*?href=\{href\}/);
  });

  it('REQ-READ-002: declares a transition:name derived from slug for shared-element morph', () => {
    expect(digestCardSource).toContain('transition:name={transitionName}');
    expect(digestCardSource).toMatch(/card-\$\{slug\}/);
  });

  it('REQ-READ-001: reduced-motion removes the entrance animation', () => {
    expect(digestCardSource).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none/,
    );
  });

  it('REQ-READ-001: link target resolves to the detail route', () => {
    expect(digestCardSource).toMatch(/\/digest\/\$\{digestId\}\/\$\{slug\}/);
  });
});

describe('LoadingSkeleton.astro — REQ-READ-004 AC 2', () => {
  it('REQ-READ-004: skeleton shimmer is 1.4s linear', () => {
    expect(skeletonSource).toMatch(/skeleton-shimmer\s*1\.4s\s*linear/);
  });

  it('REQ-READ-004: shimmer gradient spans 0% to 100% for the sweep effect', () => {
    expect(skeletonSource).toContain('linear-gradient(');
    expect(skeletonSource).toContain('background-size: 200% 100%');
  });

  it('REQ-READ-004: shimmer is disabled under prefers-reduced-motion', () => {
    expect(skeletonSource).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none/,
    );
  });

  it('REQ-READ-004: skeleton matches card min-height of 140px so no layout shift', () => {
    expect(skeletonSource).toContain('min-height: 140px');
  });
});

describe('PendingBanner.astro — REQ-READ-005', () => {
  it('REQ-READ-005: renders "Next digest scheduled at HH:MM — in Xh Ym" for returning users', () => {
    expect(pendingBannerSource).toContain('Next digest scheduled at');
  });

  it('REQ-READ-005: renders "Your first digest is scheduled for HH:MM" when firstEver', () => {
    expect(pendingBannerSource).toContain('Your first digest is scheduled for');
  });

  it('REQ-READ-005: renders from nextScheduledAt + tz props', () => {
    expect(pendingBannerSource).toContain('nextScheduledAt');
    expect(pendingBannerSource).toContain("localHourMinuteInTz(nextScheduledAt, tz)");
  });

  it('REQ-READ-005: ticks the countdown every 60s via setInterval', () => {
    expect(pendingBannerSource).toContain('setInterval');
    expect(pendingBannerSource).toContain('60_000');
  });

  it('REQ-READ-005: uses the data-next-at attribute as the source of truth', () => {
    expect(pendingBannerSource).toContain('data-next-at');
  });

  it('REQ-READ-005: tears down interval on astro:before-swap to avoid leaks', () => {
    expect(pendingBannerSource).toContain("astro:before-swap");
    expect(pendingBannerSource).toContain('clearInterval');
  });
});

describe('digest.astro — REQ-READ-005 pending banner visibility', () => {
  it('REQ-READ-005: shows the banner when digest is missing OR not today AND next_scheduled_at is set', () => {
    expect(digestPageSource).toMatch(/showBanner\s*=\s*!isLive\s*&&\s*!isReadyToday/);
    expect(digestPageSource).toContain('next_scheduled_at !== null');
  });

  it('REQ-READ-005: passes firstEver=true when the user has never had a digest', () => {
    expect(digestPageSource).toContain('firstEver = digest === null');
  });

  it('REQ-READ-004: attaches data-digest-poll with the digest id to trigger the 5s poll', () => {
    expect(digestPageSource).toContain('data-digest-poll');
    expect(digestPageSource).toContain('data-digest-id={digest.id}');
  });

  it('REQ-READ-006: redirects to /digest/failed when status is failed', () => {
    expect(digestPageSource).toContain('/digest/failed?code=');
  });

  it('REQ-READ-006: redirects to /digest/no-stories for ready digests under 3 articles', () => {
    expect(digestPageSource).toMatch(/articles\.length\s*<\s*3/);
    expect(digestPageSource).toContain('/digest/no-stories');
  });

  it('REQ-READ-006: toggles offline banner based on navigator.onLine', () => {
    expect(digestPageSource).toContain('navigator.onLine');
    expect(digestPageSource).toContain('data-offline-banner');
  });
});
