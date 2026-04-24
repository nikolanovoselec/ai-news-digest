// Implements REQ-SET-002 (default hashtag seed for new accounts)
// Implements REQ-AUTH-001 (new-account seed for the global-feed rework)
//
// Canonical list of hashtags that a newly-created user starts with.
// Every entry is already in the storage-canonical form (lowercase,
// `[a-z0-9-]+` only, no leading `#`) so callers can JSON.stringify and
// persist directly. A separate `RESTORE_DEFAULTS_LABEL` is exported so
// both the UI button and the test suite share a single string source.

export const DEFAULT_HASHTAGS: readonly string[] = [
  'cloudflare',
  'ai',
  'mcp',
  'agenticai',
  'genai',
  'aws',
  'cloud',
  'serverless',
  'workers',
  'azure',
  'zero-trust',
  'microsegmentation',
  'kubernetes',
  'terraform',
  'devsecops',
  'observability',
  'rust',
  'python',
  'postgres',
  'threat-intel'
] as const;

/** Label used by the settings-page restore button. Single-source-of-
 * truth so UI + tests never drift. */
export const RESTORE_DEFAULTS_LABEL = 'Restore initial tags';

/** Label used by the settings-page delete-initials button. Shown
 * alongside Restore; strips just the default tags from the user's
 * list, keeping any custom tags they've added. */
export const DELETE_INITIALS_LABEL = 'Delete initial tags';
