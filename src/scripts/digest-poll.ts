// Implements REQ-READ-004
//
// Client-side 5-second polling module. Polls `GET /api/digest/:id`
// while the digest is in_progress, stops immediately when the status
// transitions. On `ready`, reloads the page so the server-rendered
// `digest.astro` rebuilds the card grid with the real articles (this
// is the simplest possible path — REQ-READ-004 AC 4 wants the stagger
// animation from REQ-READ-001 to play, which re-runs naturally when
// the page re-renders). On `failed`, navigates to
// `/digest/failed?code=<error_code>`.
//
// The module exports pure helpers that accept fetch/setTimeout
// dependencies for unit testing, plus a DOM wire-up that the
// `digest.astro` page invokes in its `<script>` block.

export type DigestStatus = 'in_progress' | 'ready' | 'failed';

export interface PollResponse {
  digest: {
    id: string;
    status: DigestStatus;
    error_code?: string | null;
  };
}

/** Interval in milliseconds between polls (REQ-READ-004 AC 3). */
export const POLL_INTERVAL_MS = 5000;

/**
 * Dependencies injected into {@link pollOnce} and {@link pollLoop} so
 * the poll logic can be exercised without touching real `fetch` or
 * `window.setTimeout`.
 */
export interface PollDeps {
  fetchImpl: typeof fetch;
  setTimeoutImpl: (cb: () => void, ms: number) => unknown;
  clearTimeoutImpl: (handle: unknown) => void;
  onReady: () => void;
  onFailed: (errorCode: string | null) => void;
}

/**
 * Execute a single GET `/api/digest/:id` and return the parsed status.
 * Network or JSON errors resolve to `in_progress` so the outer loop
 * keeps polling — a transient 5xx should not promote the UI to ready.
 */
export async function pollOnce(
  digestId: string,
  fetchImpl: typeof fetch,
): Promise<{ status: DigestStatus; errorCode: string | null }> {
  try {
    const res = await fetchImpl(`/api/digest/${encodeURIComponent(digestId)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return { status: 'in_progress', errorCode: null };
    }
    const body = (await res.json()) as PollResponse;
    const status = body.digest.status;
    if (status !== 'in_progress' && status !== 'ready' && status !== 'failed') {
      return { status: 'in_progress', errorCode: null };
    }
    const errorCode =
      typeof body.digest.error_code === 'string' ? body.digest.error_code : null;
    return { status, errorCode };
  } catch {
    return { status: 'in_progress', errorCode: null };
  }
}

/**
 * Start a polling loop that invokes `onReady` or `onFailed` as soon as
 * the server reports a terminal status. Returns a cancel function the
 * caller can invoke on navigation or page unload.
 */
export function pollLoop(digestId: string, deps: PollDeps): () => void {
  let cancelled = false;
  let pending: unknown = null;

  const step = async (): Promise<void> => {
    if (cancelled) return;
    const { status, errorCode } = await pollOnce(digestId, deps.fetchImpl);
    if (cancelled) return;
    if (status === 'ready') {
      deps.onReady();
      return;
    }
    if (status === 'failed') {
      deps.onFailed(errorCode);
      return;
    }
    pending = deps.setTimeoutImpl(() => {
      void step();
    }, POLL_INTERVAL_MS);
  };

  pending = deps.setTimeoutImpl(() => {
    void step();
  }, POLL_INTERVAL_MS);

  return () => {
    cancelled = true;
    if (pending !== null) {
      deps.clearTimeoutImpl(pending);
      pending = null;
    }
  };
}

/**
 * Default DOM wire-up — reads the digest id from `data-digest-id` on
 * the poll root element, starts the loop, and teardown on
 * `astro:before-swap` so view transitions don't leave a zombie timer.
 *
 * Not called automatically; digest.astro invokes this from its inline
 * script so the bundler tree-shakes it out of pages that don't need it.
 */
export function bindDigestPoll(): () => void {
  const root = document.querySelector<HTMLElement>('[data-digest-poll]');
  if (root === null) return () => {};
  const digestId = root.dataset['digestId'];
  if (digestId === undefined || digestId === '') return () => {};
  if (root.dataset['bound'] === '1') return () => {};
  root.dataset['bound'] = '1';

  return pollLoop(digestId, {
    fetchImpl: window.fetch.bind(window),
    setTimeoutImpl: (cb, ms) => window.setTimeout(cb, ms),
    clearTimeoutImpl: (h) => window.clearTimeout(h as number),
    onReady: () => {
      // REQ-READ-004 AC 4 — re-render so the card grid and stagger
      // animation play via the server-rendered page.
      window.location.reload();
    },
    onFailed: (errorCode) => {
      const query = errorCode !== null ? `?code=${encodeURIComponent(errorCode)}` : '';
      window.location.assign(`/digest/failed${query}`);
    },
  });
}
