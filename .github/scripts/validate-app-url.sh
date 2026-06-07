#!/usr/bin/env bash
set -euo pipefail

app_url="${1:-}"
label="${2:-APP_URL}"

if [ -z "$app_url" ]; then
  echo "::error::$label is required" >&2
  exit 1
fi

host=$(printf '%s' "$app_url" | sed -E 's|^[A-Za-z]+://||; s|/.*$||; s|:.*$||')
if [ -z "$host" ]; then
  echo "::error::Could not extract hostname from $label" >&2
  exit 1
fi

case "$host" in
  *[!A-Za-z0-9.-]*)
    echo "::error::$label hostname '$host' contains invalid characters" >&2
    exit 1
    ;;
  *.workers.dev)
    echo "::error::$label must be a custom domain; workers_dev is disabled in wrangler.toml" >&2
    exit 1
    ;;
  *.*) ;;
  *)
    echo "::error::$label hostname '$host' is not fully-qualified (needs at least one dot)" >&2
    exit 1
    ;;
esac

printf '%s\n' "$host"
