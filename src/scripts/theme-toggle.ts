// Implements REQ-DES-002 click-handler wiring. Extracted from
// src/components/ThemeToggle.astro's component-level <script> so
// the site's CSP (script-src 'self') doesn't block it.
//
// Astro 5 directRenderScript inlines the bundled output of pure-import
// component <script> tags directly into HTML as <script type="module">
// blocks with no src. The CSP has no 'unsafe-inline', so the browser
// blocks every such inline script and the click handler never binds.
// Same workaround page-effects.ts already uses: ship as a top-level
// src/scripts entry that scripts/build-client-scripts.mjs compiles to
// public/scripts/theme-toggle.js, then load via <script is:inline
// type="module" src="/scripts/theme-toggle.js"> from Base.astro.
//
// Pure helpers stay in ./bundled/theme-toggle so the test suite can
// import them directly under vitest without going through esbuild's
// IIFE bundle.

import { toggleTheme } from './bundled/theme-toggle';

if (document.documentElement.dataset['themeToggleBound'] !== '1') {
  document.documentElement.dataset['themeToggleBound'] = '1';
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest<HTMLButtonElement>('[data-theme-toggle]');
      if (btn === null) return;
      e.preventDefault();
      toggleTheme(document, localStorage, (q) => window.matchMedia(q));
    },
    true,
  );
}
