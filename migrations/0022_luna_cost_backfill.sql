-- Implements REQ-SET-004
-- Implements REQ-HIST-001
-- Implements REQ-HIST-002
-- Restore missing estimates using the same standard rates as the model catalog:
-- https://developers.openai.com/api/docs/models/gpt-6-luna#pricing
-- USD per million tokens: input 0.10, output 0.50.
-- Do not reprice existing estimates or alter token usage, other models or active runs.
-- Safe to rerun: repaired rows no longer satisfy the zero-cost predicate.
UPDATE scrape_runs
SET estimated_cost_usd = (tokens_in * 0.10 + tokens_out * 0.50) / 1000000.0
WHERE model_id = 'openai/gpt-6-luna'
  AND estimated_cost_usd = 0
  AND status IN ('ready', 'failed')
  AND (tokens_in > 0 OR tokens_out > 0);
