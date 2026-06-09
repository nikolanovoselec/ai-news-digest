// Implements REQ-SET-004
//
// Hardcoded inference model catalog. The list is the source of truth —
// server-side validation (`model_id` must appear in `MODELS`) keys off it,
// the settings dropdown is rendered from it, and per-digest cost is computed
// from its per-million-token prices. The default is an AI Gateway Dynamic
// Routing route so operators can change the underlying provider/model in the
// Cloudflare dashboard without redeploying. Gateway-backed entries use a
// dedicated AI_GATEWAY_API_TOKEN runtime secret plus AI_GATEWAY_URL.
// See /sdd/settings.md REQ-SET-004 and REQUIREMENTS.md "Model selection".
//
// Single-model architecture (2026-05-06): the chunk/finalize/discovery
// pipelines run one model per call, no fallback. Swapping models means
// changing `DEFAULT_MODEL_ID` to a different entry; every other tuning
// constant (max_tokens, char budgets) stays put as long as the chosen
// model's `contextTokens` is large enough to absorb them. `contextTokens`
// is the single per-model knob — every other number in the pipeline
// stays identical across models.

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  /** USD per million input tokens. */
  inputPricePerMtok: number;
  /** USD per million output tokens. */
  outputPricePerMtok: number;
  /** Total context window size in tokens (input + output combined).
   *  Inference providers enforce `prompt_tokens + max_tokens <= contextTokens`
   *  per call. The chunk packer + LLM_PARAMS are tuned to fit inside
   *  the smallest reasonable context (~128K). Larger contexts simply
   *  leave more headroom. This is the single number that varies per
   *  model — every other tuning constant in the pipeline stays the
   *  same when swapping. */
  contextTokens: number;
  category: 'featured' | 'budget';
}

// Default model route: Cloudflare AI Gateway Dynamic Routing.
// The route named `dynamic/news_digest` is configured in the Cloudflare
// dashboard. It can point at Gemini, Workers AI, OpenAI, or a fallback/A-B
// flow without changing application code. The app still records the route
// id on scrape_runs; detailed provider/model routing lives in AI Gateway logs.
//
// This constant is the single source-of-truth for the pipeline's model
// id (chunk summarisation, rerank, discovery all flow through
// DEFAULT_MODEL_ID).
export const DEFAULT_MODEL_ID = 'dynamic/news_digest';

export const MODELS: ModelOption[] = [
  // Featured — headline choices users see at the top of the dropdown.
  {
    id: 'dynamic/news_digest',
    name: 'News Digest Dynamic Route',
    description:
      'Cloudflare AI Gateway Dynamic Routing route. Change the underlying model, fallback, or rollout in the AI Gateway dashboard without redeploying. Cost estimate uses the current Flash-Lite baseline and should be updated when the route target changes.',
    inputPricePerMtok: 0.10,
    outputPricePerMtok: 0.40,
    contextTokens: 128_000,
    category: 'featured',
  },
  {
    id: 'google-ai-studio/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description:
      'Lower-cost Gemini integration canary via Cloudflare AI Gateway BYOK and Google AI Studio. Current replacement for unavailable Gemini 2.0 Flash.',
    inputPricePerMtok: 0.10,
    outputPricePerMtok: 0.40,
    contextTokens: 1_048_576,
    category: 'featured',
  },
  {
    id: 'google-ai-studio/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description:
      'Higher-output-cost Gemini AI Gateway model. Completed integration mechanically but missed the 70% savings target.',
    inputPricePerMtok: 0.30,
    outputPricePerMtok: 2.50,
    contextTokens: 1_048_576,
    category: 'featured',
  },
  {
    id: '@cf/openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    description:
      'OpenAI 120B MoE with native JSON mode, 128K context. Prior production baseline with reliable wall-clock for chunk-sized prompts.',
    inputPricePerMtok: 0.35,
    outputPricePerMtok: 0.75,
    contextTokens: 128_000,
    category: 'featured',
  },
  {
    id: '@cf/zai-org/glm-4.7-flash',
    name: 'GLM 4.7 Flash',
    description:
      'Z.ai GLM Flash instruction model, 131K context. Low cost, but integration retests missed the required savings and reproduced chunk-cancellation risk.',
    inputPricePerMtok: 0.0605,
    outputPricePerMtok: 0.40,
    contextTokens: 131_072,
    category: 'featured',
  },
  {
    id: '@cf/ibm-granite/granite-4.0-h-micro',
    name: 'Granite 4.0 H Micro',
    description:
      'IBM Granite instruction model, 131K context. Very low cost, but the 2026-06 integration canary missed most candidate alignments.',
    inputPricePerMtok: 0.017,
    outputPricePerMtok: 0.112,
    contextTokens: 131_000,
    category: 'featured',
  },
  {
    id: '@cf/google/gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B',
    description:
      'Google instruction-tuned, 256K context. Rejected as primary after full-current-corpus integration refresh hit invalid/truncated JSON.',
    inputPricePerMtok: 0.10,
    outputPricePerMtok: 0.30,
    contextTokens: 256_000,
    category: 'featured',
  },
  {
    id: '@cf/openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    description:
      'Native JSON mode, 128K context. Cheaper sibling of 120B at $0.20/$0.30 per Mtok, but integration retests showed late chunks, invalid-JSON retries, and title-alignment drops.',
    inputPricePerMtok: 0.20,
    outputPricePerMtok: 0.30,
    contextTokens: 128_000,
    category: 'featured',
  },
  {
    id: '@cf/moonshotai/kimi-k2.5',
    name: 'Kimi K2.5',
    description:
      'Frontier MoE from Moonshot AI. 256K context, vision, reasoning.',
    inputPricePerMtok: 0.60,
    outputPricePerMtok: 3.00,
    contextTokens: 256_000,
    category: 'featured',
  },

  // Budget — smaller or more-specialised options users can pick under "Advanced".
  {
    id: '@cf/meta/llama-3.2-1b-instruct',
    name: 'Llama 3.2 1B',
    description: 'Cheapest option. Short summaries only.',
    inputPricePerMtok: 0.027,
    outputPricePerMtok: 0.201,
    contextTokens: 128_000,
    category: 'budget',
  },
  {
    id: '@cf/mistral/mistral-7b-instruct-v0.1',
    name: 'Mistral 7B',
    description: 'Balanced small model',
    inputPricePerMtok: 0.11,
    outputPricePerMtok: 0.19,
    contextTokens: 32_768,
    category: 'budget',
  },
  {
    id: '@cf/meta/llama-3.2-3b-instruct',
    name: 'Llama 3.2 3B',
    description: 'Small Meta model',
    inputPricePerMtok: 0.051,
    outputPricePerMtok: 0.335,
    contextTokens: 128_000,
    category: 'budget',
  },
  {
    id: '@cf/meta/llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 11B',
    description: 'Mid-size Meta model, 128K context.',
    inputPricePerMtok: 0.049,
    outputPricePerMtok: 0.676,
    contextTokens: 128_000,
    category: 'budget',
  },
  {
    id: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    name: 'Mistral Small 3.1 24B',
    description: 'Mistral mid-size, 128K context.',
    inputPricePerMtok: 0.35,
    outputPricePerMtok: 0.56,
    contextTokens: 128_000,
    category: 'budget',
  },
  {
    id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek R1 32B',
    description: 'Reasoning-distilled model',
    inputPricePerMtok: 0.497,
    outputPricePerMtok: 4.881,
    contextTokens: 80_000,
    category: 'budget',
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    name: 'Llama 3.1 8B Fast',
    description: 'Budget Meta model (8K context). Kept for legacy settings.',
    inputPricePerMtok: 0.045,
    outputPricePerMtok: 0.384,
    contextTokens: 8_192,
    category: 'budget',
  },
];

/**
 * Look up a model by id. Returns `undefined` for unknown ids so callers can
 * distinguish "no model" from "invalid model" without throwing.
 */
export function modelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id);
}

/**
 * Compute the USD cost of a single LLM call given the model's per-million-
 * token prices. Returns 0 for unknown models and for models whose prices are
 * not yet published (e.g. Kimi K2.x — both fields set to 0).
 */
export function estimateCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const model = modelById(modelId);
  if (!model) return 0;
  const inputCost = (tokensIn / 1_000_000) * model.inputPricePerMtok;
  const outputCost = (tokensOut / 1_000_000) * model.outputPricePerMtok;
  return inputCost + outputCost;
}
