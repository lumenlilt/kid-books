# Memory index — L2 kid-books 專案層

> 只放這個專案的事實。「關於我／怎麼跟我合作」在 L1
> `harness/claude-home/user/USER.md`（每 session 自動注入，不必在這裡重複）。
> **每條一行、只放指標＋為什麼，內容放 repo**——兩邊都寫同一件事會漂移。
> 狀態型記憶（會靜默變假的）寫入時就標 `volatile: true` + `verify_by:`。

- [Azure 金鑰住在 profit](azure-speech-key-lives-in-profit.md) — 旁白 TTS 用環境變數讀 profit/config 的金鑰，不複製進公開 repo
- [Cloudflare zone 開關會漏第三方](cloudflare-zone-toggles-leak-third-party.md) — Web Analytics 注入與 NEL 只有 dashboard 關得掉；check-site 是探針
