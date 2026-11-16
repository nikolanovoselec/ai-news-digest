#!/usr/bin/env bash
set -euo pipefail

# npm 12 retains the fixed peer resolver. Pin the complete bundled CLI by
# registry-published SHA-512 before extracting or executing any archive content.
npm_dir=$(mktemp -d "${RUNNER_TEMP:?}/npm-12.2.2.XXXXXX")
archive="$npm_dir/npm.tgz"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --max-time 60 \
  https://registry.npmjs.org/npm/-/npm-12.2.2.tgz --output "$archive"
printf '%s  %s\n' \
  '2a09606d9c9a71fee31fe147b8d46a56e0b3422f15848d9aec9f3b231e3716c3d3b99a065a62175c6759b4150e03bf6fc0bf8825112a511573ba903b3ec41370' \
  "$archive" | sha512sum --check --strict

tar -xzf "$archive" -C "$npm_dir"
mkdir "$npm_dir/bin"
ln -s "$npm_dir/package/bin/npm-cli.js" "$npm_dir/bin/npm"
ln -s "$npm_dir/package/bin/npx-cli.js" "$npm_dir/bin/npx"
version=$("$npm_dir/bin/npm" --version)
test "$version" = '12.2.2'
printf 'npm %s\n' "$version"
printf '%s\n' "$npm_dir/bin" >> "${GITHUB_PATH:?}"
