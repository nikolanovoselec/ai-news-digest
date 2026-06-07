// Implements REQ-PIPE-002
// Implements REQ-PIPE-003
//
// Single LLM-call entrypoint used by every model site that expects
// a JSON response (chunk consumer, dedup rerank, discovery).
//
// Single-model architecture (2026-05-06): the helper runs ONE model
// per call. The previous primary-then-fallback path (Gemma → 120b)
// was removed when the project consolidated on a single model;
// swapping models means changing `DEFAULT_MODEL_ID` in `~/lib/models`,
// not threading two model ids through every call site.
//
// Why a helper, not three copies:
//   - Token-cost accounting was subtly different at each site (only
//     the chunk consumer tracked wasted cost on primary failure;
//     discovery dropped the cost entirely). Centralising fixes that
//     by construction.
//   - Tests only need to pin the contract here, not at every site.
//
// Behavior:
//   1. Run the model. If `narrow` returns a non-null T, return
//      `{ ok: true }` with the parsed payload and token counts.
//   2. If the call throws (AiError 3046 timeout, network errors,
//      capacity failures) OR `narrow` returns null, return
//      `{ ok: false }` with the raw response so the caller can write
//      a site-specific diagnostic log line.

import { DEFAULT_MODEL_ID, estimateCost } from '~/lib/models';
import {
  extractResponsePayload,
  extractTokensIn,
  extractTokensOut,
  type AIRunResponse,
} from '~/lib/generate';

/** Minimal Workers-AI binding shape. We intentionally do not import
 *  the platform-typed `Ai` here so this helper is trivial to mock. */
export interface AiBinding {
  run: (model: string, params: Record<string, unknown>) => Promise<unknown>;
}

/** Cast an unknown env binding to {@link AiBinding}. Centralizes the
 *  three identical `as unknown as { run: ... }` casts that were
 *  duplicated across queue consumers and discovery (CF-016). */
export function asAiBinding(ai: unknown): AiBinding {
  return ai as AiBinding;
}

const AI_GATEWAY_MODEL_PREFIXES = ['google-ai-studio/'] as const;

// Keep each Gateway call well below the queue/Worker wall-clock budget so
// a stalled upstream provider surfaces through runJson's ok:false path
// instead of letting the platform cancel the isolate.
const AI_GATEWAY_TIMEOUT_MS = 120_000;

function modelUsesAiGateway(model: string): boolean {
  return AI_GATEWAY_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

export interface AttemptInfo {
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  rawResponse: unknown;
}

export type LlmRunResult<T> =
  | {
      ok: true;
      parsed: T;
      modelUsed: string;
      tokensIn: number;
      tokensOut: number;
      costUsd: number;
      rawResponse: unknown;
    }
  | {
      ok: false;
      attempt: AttemptInfo;
    };

export interface RunJsonOptions<T> {
  ai: AiBinding;
  params: Record<string, unknown>;
  /** Caller-supplied parser. Returns the narrowed payload or null. */
  narrow: (rawResponse: unknown) => T | null;
  /** Optional override; defaults to DEFAULT_MODEL_ID. */
  model?: string;
  /** Up to five AI Gateway metadata entries for log correlation. */
  metadata?: Record<string, string | number | boolean> | undefined;
  /** Least-privilege runtime bearer token for Cloudflare AI Gateway. */
  aiGatewayApiToken?: string | undefined;
  /** Runtime-configured AI Gateway compat chat completions endpoint. */
  aiGatewayUrl?: string | undefined;
  /** Test seam for the AI Gateway HTTP path. */
  fetchImpl?: typeof fetch | undefined;
}

export async function runJson<T>(
  options: RunJsonOptions<T>,
): Promise<LlmRunResult<T>> {
  const model = options.model ?? DEFAULT_MODEL_ID;

  // The model-runner boundary is `Promise<unknown>` because every
  // provider emits a slightly different envelope. The shared helpers
  // in ~/lib/generate accept the wider AIRunResponse shape
  // (which has an index signature) and gracefully tolerate missing
  // fields, so a single cast at the boundary is safe.
  //
  // Throws (AiError 3046 timeout, network errors, capacity failures)
  // are caught and surfaced as `ok: false` so the caller can decide
  // whether to retry the queue message or surface a structured log.
  let result: AIRunResponse | null = null;
  let threwError: string | null = null;
  try {
    result = (await runModel(model, options)) as AIRunResponse;
  } catch (err) {
    threwError = String(err).slice(0, 500);
  }
  const raw = result === null ? null : extractResponsePayload(result);
  const parsed = result === null ? null : options.narrow(raw);
  const tokensIn = result === null ? 0 : extractTokensIn(result);
  const tokensOut = result === null ? 0 : extractTokensOut(result);
  const costUsd = estimateCost(model, tokensIn, tokensOut);

  if (parsed !== null) {
    return {
      ok: true,
      parsed,
      modelUsed: model,
      tokensIn,
      tokensOut,
      costUsd,
      rawResponse: raw,
    };
  }

  return {
    ok: false,
    attempt: {
      modelUsed: model,
      tokensIn,
      tokensOut,
      costUsd,
      rawResponse: threwError !== null ? { error: threwError } : raw,
    },
  };
}

async function runModel<T>(
  model: string,
  options: RunJsonOptions<T>,
): Promise<unknown> {
  if (modelUsesAiGateway(model)) {
    const token = options.aiGatewayApiToken?.trim();
    const gatewayUrl = normalizeAiGatewayUrl(options.aiGatewayUrl);
    if (!token) throw new Error('AI Gateway API token missing for gateway model');
    if (gatewayUrl === null) throw new Error('AI Gateway URL missing or invalid for gateway model');
    return runAiGatewayChatCompletion({
      model,
      params: options.params,
      metadata: options.metadata,
      aiGatewayApiToken: token,
      aiGatewayUrl: gatewayUrl,
      fetchImpl: options.fetchImpl ?? fetch,
    });
  }

  return options.ai.run(model, options.params);
}

function normalizeAiGatewayUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    if (url.username !== '' || url.password !== '') return null;
    if (!url.pathname.endsWith('/compat/chat/completions')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function runAiGatewayChatCompletion(options: {
  model: string;
  params: Record<string, unknown>;
  metadata?: Record<string, string | number | boolean> | undefined;
  aiGatewayApiToken: string;
  aiGatewayUrl: string;
  fetchImpl: typeof fetch;
}): Promise<unknown> {
  const response = await options.fetchImpl.call(
    globalThis,
    options.aiGatewayUrl,
    {
      method: 'POST',
      signal: AbortSignal.timeout(AI_GATEWAY_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${options.aiGatewayApiToken}`,
        // Dynamic scrape chunks are retry-sensitive: if the model returns
        // malformed JSON once, serving that same cached body makes every
        // queue retry fail immediately. Always ask Gateway for a fresh
        // provider response.
        'cf-aig-skip-cache': 'true',
        ...(options.metadata !== undefined
          ? { 'cf-aig-metadata': JSON.stringify(options.metadata) }
          : {}),
      },
      body: JSON.stringify({
        model: options.model,
        // Gemini 2.5 Flash enables hidden thinking tokens unless told not
        // to. The canary needs summary quality, not chain-of-thought spend.
        reasoning_effort: 'none',
        ...options.params,
      }),
    },
  );

  const bodyText = await response.text();
  let body: unknown = undefined;
  if (bodyText !== '') {
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      body = bodyText;
    }
  }

  if (!response.ok) {
    throw new Error(
      `AI Gateway HTTP ${response.status}: ${previewRawResponse(body, 500)}`,
    );
  }

  return body;
}

/** Truncate a raw LLM response for log emission so a 50KB JSON dump
 *  doesn't blow past Cloudflare's structured-log size budget. */
export function previewRawResponse(raw: unknown, max = 400): string {
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw) ?? String(raw);
  return s.slice(0, max);
}
