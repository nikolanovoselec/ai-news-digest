// Tests for src/lib/embeddings.ts — REQ-PIPE-003
import { describe, it, expect, vi } from 'vitest';
import {
  buildEmbeddingInput,
  cosineSimilarity,
  embedTexts,
  readCosineThreshold,
  EMBEDDING_MODEL_ID,
  DEFAULT_COSINE_THRESHOLD,
} from '~/lib/embeddings';

describe('buildEmbeddingInput', () => {
  it('REQ-PIPE-003: prefixes title before body so leading-token attention favours headlines', () => {
    const out = buildEmbeddingInput({
      title: 'Headline X',
      details_json: JSON.stringify(['body-1', 'body-2']),
    });
    expect(out.startsWith('Headline X')).toBe(true);
    expect(out).toContain('body-1');
    expect(out).toContain('body-2');
  });

  it('REQ-PIPE-003: collapses whitespace from multi-paragraph details', () => {
    const out = buildEmbeddingInput({
      title: 'T',
      details_json: JSON.stringify(['line one\n\nline two', '   line three   ']),
    });
    expect(out).not.toMatch(/\s\s/);
  });

  it('REQ-PIPE-003: caps total length at MAX_INPUT_CHARS', () => {
    const long = 'x'.repeat(5000);
    const out = buildEmbeddingInput({
      title: 'T',
      details_json: JSON.stringify([long]),
    });
    // The cap is 1800 — output must not exceed it.
    expect(out.length).toBeLessThanOrEqual(1800);
  });

  it('REQ-PIPE-003: tolerates malformed details_json JSON', () => {
    const out = buildEmbeddingInput({
      title: 'Headline',
      details_json: 'not-json{',
    });
    expect(out.startsWith('Headline')).toBe(true);
  });

  it('REQ-PIPE-003: falls back to body_summary when details_json is missing', () => {
    const out = buildEmbeddingInput({
      title: 'Headline',
      body_summary: 'plain body',
    });
    expect(out).toContain('plain body');
  });
});

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical unit vectors', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('returns -1 for anti-parallel vectors', () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 6);
  });

  it('returns 0 on empty input rather than throwing', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 0], [])).toBe(0);
  });

  it('returns 0 on mismatched lengths', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it('returns 0 when either vector has zero magnitude', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('readCosineThreshold', () => {
  it('returns the default when env var is unset', () => {
    expect(readCosineThreshold({})).toBe(DEFAULT_COSINE_THRESHOLD);
  });

  it('parses a valid float from the env', () => {
    expect(readCosineThreshold({ DEDUP_COSINE_THRESHOLD: '0.9' })).toBe(0.9);
  });

  it('falls back to the default on out-of-range values', () => {
    expect(readCosineThreshold({ DEDUP_COSINE_THRESHOLD: '-0.5' })).toBe(
      DEFAULT_COSINE_THRESHOLD,
    );
    expect(readCosineThreshold({ DEDUP_COSINE_THRESHOLD: '1.5' })).toBe(
      DEFAULT_COSINE_THRESHOLD,
    );
  });

  it('falls back to the default on non-numeric values', () => {
    expect(readCosineThreshold({ DEDUP_COSINE_THRESHOLD: 'banana' })).toBe(
      DEFAULT_COSINE_THRESHOLD,
    );
  });
});

describe('embedTexts', () => {
  it('REQ-PIPE-003: calls Workers AI with the pinned bge-base model id', async () => {
    const run = vi.fn().mockResolvedValue({
      data: [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ],
    });
    await embedTexts({ run } as Pick<Ai, 'run'>, ['t1', 't2']);
    expect(run).toHaveBeenCalledTimes(1);
    const [model, params] = run.mock.calls[0] as [string, { text: string[] }];
    expect(model).toBe(EMBEDDING_MODEL_ID);
    expect(params.text).toEqual(['t1', 't2']);
  });

  it('REQ-PIPE-003: returns the vectors in input order', async () => {
    const run = vi.fn().mockResolvedValue({
      data: [
        [1, 1, 1],
        [2, 2, 2],
      ],
    });
    const out = await embedTexts({ run } as Pick<Ai, 'run'>, ['a', 'b']);
    expect(out[0]).toEqual([1, 1, 1]);
    expect(out[1]).toEqual([2, 2, 2]);
  });

  it('REQ-PIPE-003: throws on length mismatch between inputs and response', async () => {
    const run = vi.fn().mockResolvedValue({
      data: [[1, 1, 1]],
    });
    await expect(
      embedTexts({ run } as Pick<Ai, 'run'>, ['a', 'b']),
    ).rejects.toThrow(/expected 2 vectors, got 1/);
  });

  it('REQ-PIPE-003: throws on empty vector in response', async () => {
    const run = vi.fn().mockResolvedValue({
      data: [[], [1, 2, 3]],
    });
    await expect(
      embedTexts({ run } as Pick<Ai, 'run'>, ['a', 'b']),
    ).rejects.toThrow(/empty vector/);
  });

  it('REQ-PIPE-003: returns empty array for empty inputs without calling AI', async () => {
    const run = vi.fn();
    const out = await embedTexts({ run } as Pick<Ai, 'run'>, []);
    expect(out).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('REQ-PIPE-003: throws when batch exceeds the cap', async () => {
    const run = vi.fn();
    const huge = Array.from({ length: 200 }, (_, i) => `t${i}`);
    await expect(
      embedTexts({ run } as Pick<Ai, 'run'>, huge),
    ).rejects.toThrow(/batch size 200 exceeds cap/);
    expect(run).not.toHaveBeenCalled();
  });
});
