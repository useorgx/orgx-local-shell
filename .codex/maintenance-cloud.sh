#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

export CI=1
export npm_config_audit=false
export npm_config_fund=false

npm ci

tmp_dir="${TMPDIR:-/tmp}/orgx-local-shell-cloud-deps"
rm -rf "$tmp_dir"
mkdir -p "$tmp_dir"
git clone --depth 1 https://github.com/useorgx/orgx-data.git "$tmp_dir/orgx-data"
git clone --depth 1 https://github.com/useorgx/orgx-ui-kit.git "$tmp_dir/orgx-ui-kit"
npm --prefix "$tmp_dir/orgx-data" install --package-lock=false
npm --prefix "$tmp_dir/orgx-data" run build
npm --prefix "$tmp_dir/orgx-ui-kit" install --package-lock=false
npm --prefix "$tmp_dir/orgx-ui-kit" run build
npm install --no-save --package-lock=false "$tmp_dir/orgx-data" "$tmp_dir/orgx-ui-kit"
