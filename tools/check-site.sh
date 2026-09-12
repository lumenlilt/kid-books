#!/usr/bin/env bash
# 部署後驗證。⚠️ 判準是 <title> 與標頭，不是 HTTP 狀態碼：
# 這個站是 SPA，任何路徑都會回 index.html 200，看狀態碼永遠是綠的（dosekit 2026-08-25 的教訓）。
#   bash tools/check-site.sh                      # 檢查 kid-books.<account>.workers.dev 要自己帶
#   bash tools/check-site.sh books.lumenlilt.app
set -uo pipefail
HOST="${1:?用法：check-site.sh <host>}"
FAIL=0
HTML=$(curl -s -m 15 "https://$HOST/")
TITLE=$(printf '%s' "$HTML" | grep -oE '<title>[^<]*</title>' | head -1)
[ -n "$TITLE" ] && echo "✔ /  $TITLE" || { echo "✘ /  抓不到 <title>"; FAIL=1; }
HDR=$(curl -sI -m 15 "https://$HOST/")
printf '%s' "$HDR" | grep -qi '^content-security-policy:' && echo "✔ CSP 標頭在" || { echo "✘ 沒有 Content-Security-Policy 標頭（_headers 沒部署上去？）"; FAIL=1; }
printf '%s' "$HDR" | grep -qi 'default-src .self.' && echo "✔ CSP default-src 'self'" || { echo "✘ CSP 不是 default-src 'self'"; FAIL=1; }
CT=$(curl -sI -m 15 "https://$HOST/manifest.webmanifest" | grep -i '^content-type:' | head -1)
printf '%s' "$CT" | grep -qi 'manifest' && echo "✔ /manifest.webmanifest $CT" || echo "△ /manifest.webmanifest 的 content-type 是「${CT:-（無）}」（M6 之前可以是空的）"
exit $FAIL
