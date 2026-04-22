// Implements REQ-MAIL-001, REQ-MAIL-002
//
// Resend-backed email notification used after every successful scheduled
// digest. Best-effort: a Resend outage or misconfiguration never blocks or
// fails a digest that otherwise completed — `sendDigestEmail` always resolves
// to a result object and never re-throws.
//
// Template lives in this file verbatim because email clients strip <style>
// blocks; every rule must be inlined on the element it applies to. User-
// derived strings (top_tags, gh_login, article_count when stringified) are
// HTML-escaped via the local {@link escapeHtml} helper before interpolation.
//
// REQ-MAIL-003 (sender domain verification) is a manual/deployment concern;
// this module assumes `env.RESEND_FROM` is a valid, verified sender address.
// It is NOT the module's responsibility to validate the domain.
//
// Secrets hygiene (CON-SEC-001): never log `env.RESEND_API_KEY` or the full
// HTML/text bodies. `email.send.failed` logs carry the user + digest ids and
// the HTTP status — enough to triage, not enough to leak content.

import { log } from '~/lib/log';

/**
 * Inputs required to render and send a digest-ready email. Values originate
 * from the digest consumer: `user` from the `users` row, the rest from the
 * `digests` row and derived aggregates (tags, article count).
 */
export interface DigestEmailContext {
  user: {
    email: string;
    gh_login: string;
  };
  digest_id: string;
  local_date: string;
  article_count: number;
  top_tags: string[];
  execution_ms: number;
  tokens: number;
  estimated_cost_usd: number;
  model_name: string;
  app_url: string;
}

/**
 * Result shape from {@link sendDigestEmail}. `sent: true` means Resend
 * returned a 2xx. Any other outcome sets `sent: false` and populates
 * `error_code` with one of the closed set below; callers never see
 * a thrown error.
 */
export interface SendDigestEmailResult {
  sent: boolean;
  error_code?: 'resend_non_2xx' | 'resend_error';
}

/** Resend REST endpoint — identical across environments. */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Per-call timeout. Longer than the median (~300ms) but short enough that a
 * stuck request never delays the digest consumer's next message. */
const RESEND_TIMEOUT_MS = 5000;

/** Escape a string for interpolation into HTML text or attribute contexts.
 * Minimal replacement set — covers the characters that can break out of a
 * text node or a double-quoted attribute value. Do not use this for URLs
 * embedded in `href=""`; use `encodeURI`/`encodeURIComponent` separately. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format execution_ms as a "X.Ys" string with one decimal. */
function formatExecutionSeconds(execution_ms: number): string {
  return (execution_ms / 1000).toFixed(1);
}

/** Format estimated cost in USD with four decimals, e.g. "0.0012". */
function formatCostUsd(estimated_cost_usd: number): string {
  return estimated_cost_usd.toFixed(4);
}

/** Render the top-3 tags as a comma-separated string for display.
 * Returns an empty string if no tags are present, so callers interpolating
 * it get graceful output ("N stories curated from your interests." rather
 * than "N stories curated from your interests: ."). */
function formatTopTags(top_tags: string[]): string {
  return top_tags.slice(0, 3).join(', ');
}

/**
 * Build the Swiss-minimal HTML body for the digest-ready email. Every CSS
 * rule is inlined on the element it affects because email clients (Gmail,
 * Outlook, Yahoo) strip or ignore `<style>` blocks. All user-derived values
 * are HTML-escaped before interpolation.
 */
export function renderDigestEmailHtml(ctx: DigestEmailContext): string {
  const appUrl = ctx.app_url.replace(/\/+$/, '');
  const digestHref = `${appUrl}/digest`;
  const settingsHref = `${appUrl}/settings`;

  const count = String(ctx.article_count);
  const tagsJoined = formatTopTags(ctx.top_tags);
  const summarySentence = tagsJoined.length > 0
    ? `${escapeHtml(count)} stories curated from your interests: ${escapeHtml(tagsJoined)}.`
    : `${escapeHtml(count)} stories curated from your interests.`;

  const executionSeconds = formatExecutionSeconds(ctx.execution_ms);
  const tokensDisplay = ctx.tokens.toLocaleString('en-US');
  const costDisplay = formatCostUsd(ctx.estimated_cost_usd);
  const modelDisplay = escapeHtml(ctx.model_name);

  return `<!doctype html>
<html>
  <body style="margin:0; padding:48px 24px; background:#fafafa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif; color:#111;">
    <table role="presentation" width="100%" style="max-width:560px; margin:0 auto;">
      <tr><td style="padding-bottom:32px; font-size:14px; color:#666; letter-spacing:0.02em; text-transform:uppercase;">News Digest</td></tr>
      <tr><td style="padding-bottom:24px; font-size:32px; font-weight:600; line-height:1.2;">Your daily digest is ready</td></tr>
      <tr><td style="padding-bottom:32px; font-size:16px; color:#444; line-height:1.6;">${summarySentence}</td></tr>
      <tr><td style="padding-bottom:48px;"><a href="${escapeHtml(digestHref)}" style="display:inline-block; padding:14px 28px; background:#0066ff; color:#fff; text-decoration:none; font-weight:600; border-radius:6px;">Read today's digest</a></td></tr>
      <tr><td style="padding-top:32px; border-top:1px solid #e5e5e5; font-size:13px; color:#999;">Generated in ${escapeHtml(executionSeconds)}s &middot; ${escapeHtml(tokensDisplay)} tokens &middot; ~$${escapeHtml(costDisplay)} &middot; ${modelDisplay}<br><a href="${escapeHtml(settingsHref)}" style="color:#999;">Edit interests or schedule</a></td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Plaintext fallback body for clients that do not render HTML (REQ-MAIL-001
 * AC 4). Mirrors the HTML content and metadata. No escaping needed — this
 * is delivered as `text/plain`.
 */
export function renderDigestEmailText(ctx: DigestEmailContext): string {
  const appUrl = ctx.app_url.replace(/\/+$/, '');
  const tagsJoined = formatTopTags(ctx.top_tags);
  const summary = tagsJoined.length > 0
    ? `${ctx.article_count} stories curated from your interests: ${tagsJoined}.`
    : `${ctx.article_count} stories curated from your interests.`;

  const executionSeconds = formatExecutionSeconds(ctx.execution_ms);
  const tokensDisplay = ctx.tokens.toLocaleString('en-US');
  const costDisplay = formatCostUsd(ctx.estimated_cost_usd);

  return [
    'Your daily digest is ready.',
    '',
    summary,
    '',
    `Read today's digest: ${appUrl}/digest`,
    '',
    '---',
    `Generated in ${executionSeconds}s \u00b7 ${tokensDisplay} tokens \u00b7 ~$${costDisplay} \u00b7 ${ctx.model_name}`,
    `Edit interests or schedule: ${appUrl}/settings`,
    '',
  ].join('\n');
}

/**
 * Build the Resend subject line per REQ-MAIL-001 AC 2.
 * "Your news digest is ready · {N} stories" — the middle dot is U+00B7,
 * matching the app's typographic conventions (cost/time transparency footer).
 */
export function renderDigestEmailSubject(ctx: DigestEmailContext): string {
  return `Your news digest is ready \u00b7 ${ctx.article_count} stories`;
}

/**
 * Send the digest-ready email via Resend. Never re-throws — returns a
 * {@link SendDigestEmailResult} describing the outcome.
 *
 * Failure modes (REQ-MAIL-002):
 *  - Non-2xx response → logged as `email.send.failed` with status, returns
 *    `{ sent: false, error_code: 'resend_non_2xx' }`.
 *  - Network error, timeout, or any exception from `fetch` → logged as
 *    `email.send.failed` with the error message, returns
 *    `{ sent: false, error_code: 'resend_error' }`.
 *
 * The caller (digest consumer) keeps the digest row at `status='ready'`
 * regardless; the in-app view is fully usable independent of email delivery.
 */
export async function sendDigestEmail(
  env: Env,
  ctx: DigestEmailContext,
): Promise<SendDigestEmailResult> {
  const subject = renderDigestEmailSubject(ctx);
  const html = renderDigestEmailHtml(ctx);
  const text = renderDigestEmailText(ctx);

  const payload = {
    from: env.RESEND_FROM,
    to: [ctx.user.email],
    subject,
    html,
    text,
    tags: [{ name: 'kind', value: 'daily-digest' }],
  };

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
  } catch (err) {
    // Network error, DNS failure, timeout (AbortError), or any thrown
    // value. Logged but never re-thrown — email is best-effort.
    log('error', 'email.send.failed', {
      user_id: ctx.user.gh_login,
      digest_id: ctx.digest_id,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    });
    return { sent: false, error_code: 'resend_error' };
  }

  if (!response.ok) {
    log('error', 'email.send.failed', {
      user_id: ctx.user.gh_login,
      digest_id: ctx.digest_id,
      status: response.status,
    });
    return { sent: false, error_code: 'resend_non_2xx' };
  }

  return { sent: true };
}
