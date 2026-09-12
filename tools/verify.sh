#!/usr/bin/env bash
# verify_by: 2027-03-12
# 一條指令跑完所有會紅的檢查；CI 與 `npm run deploy` 都只呼叫它。
# 為什麼獨立成檔：檢查散在 package.json scripts 裡會被個別跳過，集中一條就沒得跳。
set -euo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
step typecheck;    npm run -s typecheck
step vitest;       npm run -s test
step build;        npm run -s build
step check:audio;  node tools/check-audio.mjs
step check:assets; node tools/check-assets.mjs
step check:font;   node tools/check-font.mjs
step check:hosts;  node tools/check-hosts.mjs
printf '\n✅ verify 全綠\n'
