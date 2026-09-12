---
name: cloudflare-zone-toggles-leak-third-party
description: lumenlilt.app 這個 zone 的 Web Analytics 自動注入與 NEL 會在 books.lumenlilt.app 加第三方 beacon 與回報標頭，repo 看不到，只有 dashboard 關得掉
metadata:
  type: project
  volatile: true
  verify_by: 2026-12-12
---

2026-09-12 首次 `wrangler deploy` 後，瀏覽器請求的 HTML 被 Cloudflare 注入
`static.cloudflareinsights.com/beacon.min.js`（zone 的 Web Analytics「自動設定」），回應另帶 `nel`／`report-to`
（Network Error Logging）。CSP 擋住了 beacon，NEL 擋不住。純 curl 抓不到注入（要瀏覽器 UA＋Accept 才會觸發）。

**Why:** 兒童產品零第三方是硬規則（D12），而這兩個是平台層級的預設，跟 dosekit 遇到的 Email Obfuscation 同一族（L1 規則⑤之一）。
**How to apply:** `tools/check-site.sh` 已是探針（beacon 紅、NEL 警告）；`npm run deploy` 會停在那裡直到使用者在 dashboard 關掉。
不要改 CSP 去「允許」它——那是反方向。
