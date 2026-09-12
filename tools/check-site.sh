#!/usr/bin/env bash
# 部署後驗證。⚠️ 判準是 <title> 與標頭，不是 HTTP 狀態碼：
# 這個站是 SPA，任何路徑都會回 index.html 200，看狀態碼永遠是綠的（dosekit 2026-08-25 的教訓）。
#   bash tools/check-site.sh                      # 檢查 kid-books.<account>.workers.dev 要自己帶
#   bash tools/check-site.sh books.lumenlilt.app
set -uo pipefail
HOST="${1:?用法：check-site.sh <host>}"
FAIL=0
# ⚠️ 要用瀏覽器一樣的 UA 與 Accept 去抓：Cloudflare 只對「看起來是瀏覽器」的請求注入 beacon，
#   純 curl 抓到的 HTML 是乾淨的、探針會假綠（2026-09-12 實測）。
UA="Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
ACC="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
HTML=$(curl -s -m 15 -A "$UA" -H "Accept: $ACC" "https://$HOST/")
TITLE=$(printf '%s' "$HTML" | grep -oE '<title>[^<]*</title>' | head -1)
[ -n "$TITLE" ] && echo "✔ /  $TITLE" || { echo "✘ /  抓不到 <title>"; FAIL=1; }
HDR=$(curl -sI -m 15 -A "$UA" -H "Accept: $ACC" "https://$HOST/")
printf '%s' "$HDR" | grep -qi '^content-security-policy:' && echo "✔ CSP 標頭在" || { echo "✘ 沒有 Content-Security-Policy 標頭（_headers 沒部署上去？）"; FAIL=1; }
printf '%s' "$HDR" | grep -qi 'default-src .self.' && echo "✔ CSP default-src 'self'" || { echo "✘ CSP 不是 default-src 'self'"; FAIL=1; }
# ⚠️ 平台代管開關的探針（L1 規則⑤之一）：Cloudflare 的 Web Analytics「自動設定」會在 HTML 注入第三方 beacon，
#   repo 裡看不到、CSP 會擋掉但 console 會紅。2026-09-12 第一次部署就中。關掉：Cloudflare → Web Analytics →
#   這個 hostname → 停用自動注入（或整個 zone 關掉）。
if printf '%s' "$HTML" | grep -qi 'cloudflareinsights'; then
  echo "✘ HTML 被注入 Cloudflare Web Analytics beacon（zone 層級開關）——兒童產品零第三方，去 dashboard 關掉"; FAIL=1
else
  echo "✔ 沒有被注入第三方 beacon"
fi
# NEL／report-to：瀏覽器會把網路錯誤回報給 Cloudflare（a.nel.cloudflare.com），CSP 擋不到；零第三方原則下也該關（zone 設定）
if printf '%s' "$HDR" | grep -qi '^nel:'; then
  echo "△ 回應帶 NEL／report-to 標頭（瀏覽器會向 Cloudflare 回報網路錯誤）——dashboard 關掉 Network Error Logging"
else
  echo "✔ 沒有 NEL 標頭"
fi
CT=$(curl -sI -m 15 "https://$HOST/manifest.webmanifest" | grep -i '^content-type:' | head -1)
printf '%s' "$CT" | grep -qi 'manifest' && echo "✔ /manifest.webmanifest $CT" || echo "△ /manifest.webmanifest 的 content-type 是「${CT:-（無）}」（M6 之前可以是空的）"
exit $FAIL
