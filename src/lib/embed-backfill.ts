// Implements REQ-PIPE-003
//
// Pure library form of the embedding-backfill batch step. Lifted out
// of `~/pages/api/admin/embed-backfill` so the pipeline-consumer queue
// handler can import the work without depending on a route handler —
// the previous shape was a queue→route inversion that made
// pipeline-consumer.ts impossible to reason about in isolation
// (queue consumer importing from `pages/api/`).
//
// The route handler still owns the HTTP wrapping: auth, redirect
// shaping, the cumulative loop. This file owns ONE batch.

import { log } from '~/lib/log';
import { buildEmbeddingInput, embedTexts } from '~/lib/embeddings';

/** Per-batch ceiling. 50 articles × 768-dim ≈ 150 KB of vectors per
 *  upsert — well inside Vectorize batch limits, and small enough that
 *  a single Workers AI call stays under the per-request 2-minute
 *  isolate budget even if the model takes a few seconds. */
export const BATCH_SIZE = 50;

interface ArticleRow {
  id: string;
  title: string;
  details_json: string;
  source_snippet: string | null;
  published_at: number;
  primary_source_url: string;
}

export interface BatchResult {
  ok: true;
  processed: number;
  failed: number;
  remaining: number;
  done: boolean;
}

export async function runOneBackfillBatch(env: Env): Promise<BatchResult> {
  const result = await env.DB
    .prepare(
      `SELECT id, title, details_json, source_snippet, published_at,
              primary_source_url
         FROM articles
        WHERE embedding_status IS NULL OR embedding_status = 'failed'
        ORDER BY published_at ASC
        LIMIT ?1`,
    )
    .bind(BATCH_SIZE)
    .all<ArticleRow>();

  const rows = result.results ?? [];
  if (rows.length === 0) {
    return { ok: true, processed: 0, failed: 0, remaining: 0, done: true };
  }

  const inputs = rows.map((r) => buildEmbeddingInput(r));
  let vectors: number[][];
  try {
    vectors = await embedTexts(env.AI, inputs);
  } catch (err) {
    log('error', 'digest.generation', {
      status: 'embed_backfill_embed_failed',
      batch_size: rows.length,
      detail: String(err).slice(0, 500),
    });
    // Mark every row in this batch failed so the next pass tries
    // again. Without this UPDATE the rows stay NULL and the same
    // batch would loop forever on a poison input.
    await env.DB
      .prepare(
        `UPDATE articles
            SET embedding_status = 'failed'
          WHERE id IN (${rows.map((_, i) => `?${i + 1}`).join(',')})`,
      )
      .bind(...rows.map((r) => r.id))
      .run();
    const remaining = await countRemaining(env);
    return {
      ok: true,
      processed: 0,
      failed: rows.length,
      remaining,
      done: remaining === 0,
    };
  }

  try {
    await env.VECTORIZE.upsert(
      rows.map((r, i) => ({
        id: r.id,
        values: vectors[i] as number[],
        metadata: {
          published_at: r.published_at,
          primary_source_url: r.primary_source_url,
        },
      })),
    );
  } catch (err) {
    log('error', 'digest.generation', {
      status: 'embed_backfill_upsert_failed',
      batch_size: rows.length,
      detail: String(err).slice(0, 500),
    });
    await env.DB
      .prepare(
        `UPDATE articles
            SET embedding_status = 'failed'
          WHERE id IN (${rows.map((_, i) => `?${i + 1}`).join(',')})`,
      )
      .bind(...rows.map((r) => r.id))
      .run();
    const remaining = await countRemaining(env);
    return {
      ok: true,
      processed: 0,
      failed: rows.length,
      remaining,
      done: remaining === 0,
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const updates = rows.map((r) =>
    env.DB
      .prepare(
        `UPDATE articles
            SET embedding_status = 'embedded', embedded_at = ?2
          WHERE id = ?1`,
      )
      .bind(r.id, nowSec),
  );
  await env.DB.batch(updates);

  const remaining = await countRemaining(env);
  log('info', 'digest.generation', {
    status: 'embed_backfill_batch_completed',
    processed: rows.length,
    remaining,
  });

  return {
    ok: true,
    processed: rows.length,
    failed: 0,
    remaining,
    done: remaining === 0,
  };
}

export async function countRemaining(env: Env): Promise<number> {
  const row = await env.DB
    .prepare(
      `SELECT COUNT(*) AS c FROM articles
        WHERE embedding_status IS NULL OR embedding_status = 'failed'`,
    )
    .first<{ c: number }>();
  return row?.c ?? 0;
}
