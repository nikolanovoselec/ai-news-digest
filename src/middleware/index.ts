// Implements REQ-OPS-003
//
// Astro auto-discovers `src/middleware/index.ts` and uses its `onRequest`
// export (or the `sequence(...)` composition) as the app-wide middleware
// chain. Every HTTP response served by Astro therefore passes through this
// file before reaching the browser.
//
// Today the chain contains only the security-headers middleware
// (REQ-OPS-003). Other middlewares in this folder — `auth.ts` and
// `origin-check.ts` — expose helper functions that individual route
// handlers call directly rather than running app-wide, so they deliberately
// are NOT registered here.
//
// If a future feature needs additional global middleware, compose it with
// `sequence(...)` from `astro:middleware` and keep `securityHeadersMiddleware`
// LAST so that it stamps headers onto the final response and no earlier
// middleware can strip them.

export { securityHeadersMiddleware as onRequest } from './security-headers';
