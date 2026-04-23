// Operator-only manual kick of the hourly global-feed coordinator.
//
// Accepts POST (from the Settings page button) + GET (for a direct
// URL visit). Starts a fresh scrape_runs row with status='running'
// and sends a single SCRAPE_COORDINATOR queue message — the exact
// same work the `0 * * * *` cron does.
//
// Access control: this endpoint is intended to be gated by Cloudflare
// Access at the zone level. Worker-side defence-in-depth still
// enforces an Origin check on POST (REQ-AUTH-003 pattern) to block
// cross-site CSRF even from a logged-in browser.

import type { APIContext } from 'astro';
import { log } from '~/lib/log';
import { generateUlid } from '~/lib/ulid';
import { startRun } from '~/lib/scrape-run';
import { DEFAULT_MODEL_ID } from '~/lib/models';
import { checkOrigin, originOf } from '~/middleware/origin-check';

async function kickCoordinator(env: Env): Promise<string> {
  const scrape_run_id = generateUlid();
  await startRun(env.DB, { id: scrape_run_id, model_id: DEFAULT_MODEL_ID });
  await env.SCRAPE_COORDINATOR.send({ scrape_run_id });
  log('info', 'digest.generation', {
    status: 'force_refresh_dispatched',
    scrape_run_id,
  });
  return scrape_run_id;
}

function redirectToSettings(origin: string, runId: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `${origin}/settings?force_refresh=${runId}` },
  });
}

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
  if (typeof env.APP_URL !== 'string' || env.APP_URL === '') {
    return new Response('Application not configured', { status: 500 });
  }
  const appOrigin = originOf(env.APP_URL);

  const originResult = checkOrigin(context.request, appOrigin);
  if (!originResult.ok) return originResult.response!;

  try {
    const runId = await kickCoordinator(env);
    return redirectToSettings(appOrigin, runId);
  } catch (err) {
    log('error', 'digest.generation', {
      status: 'force_refresh_failed',
      detail: String(err).slice(0, 500),
    });
    return new Response('Failed to dispatch coordinator', { status: 500 });
  }
}

export async function GET(context: APIContext): Promise<Response> {
  // GET path exists so the operator can trigger from a bookmark or
  // curl without needing a form. Cloudflare Access is the sole gate.
  const env = context.locals.runtime.env;
  if (typeof env.APP_URL !== 'string' || env.APP_URL === '') {
    return new Response('Application not configured', { status: 500 });
  }
  const appOrigin = originOf(env.APP_URL);
  try {
    const runId = await kickCoordinator(env);
    return new Response(
      JSON.stringify({ ok: true, scrape_run_id: runId }, null, 2),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  } catch (err) {
    log('error', 'digest.generation', {
      status: 'force_refresh_failed',
      detail: String(err).slice(0, 500),
    });
    return new Response('Failed to dispatch coordinator', { status: 500 });
  }
}
