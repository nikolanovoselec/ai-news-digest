#!/usr/bin/env bash
set -euo pipefail

# Bootstrap the fixed peer resolver with the runner's bundled npm, using
# its own small lockfile rather than resolving the application's peer graph.
bootstrap_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../npm" && pwd)
npm ci --prefix "$bootstrap_dir" --ignore-scripts --no-fund --no-audit
"$bootstrap_dir/node_modules/.bin/npm" --version
printf '%s\n' "$bootstrap_dir/node_modules/.bin" >> "${GITHUB_PATH:?}"
