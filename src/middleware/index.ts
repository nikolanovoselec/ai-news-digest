// Implements REQ-OPS-003
//
// Astro discovers this app-wide middleware. Bindings are copied from the
// platform into application-owned locals so routes and their isolated tests
// share one dependency-injection contract; adapter 14 removed runtime.env.
// Authentication and origin checks remain route-owned. Security headers are
// applied after the route returns, preserving the existing response policy.

import type { MiddlewareHandler } from 'astro';
import { env } from 'cloudflare:workers';
import { securityHeadersMiddleware } from './security-headers';

export const onRequest = (async (context, next) => {
  context.locals.env = env;
  return securityHeadersMiddleware(context, next);
}) satisfies MiddlewareHandler;
