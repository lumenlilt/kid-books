# kid-books ·「魔法書房」

3D 書架×立體書的幼小銜接互動學習網站（Three.js＋DOM，開源，books.lumenlilt.app）。第一本書：認識時鐘。

## 這是什麼

給 4–7 歲小孩的瀏覽器 App：3D 房間裡的書架，點書→翻開→紙雕場景立起來→旁白帶著玩一個主題；
每頁一顆星，讀完一本書房間多一件收藏。iPad 橫式優先、零帳號零追蹤。
計畫正本 `docs/PLAN-2026-09-12.md`（里程碑 M0–M6 與完成定義）；決定與理由 `DECISIONS.md`；**進度看 `STATUS.md`，不看這裡。**

## 怎麼動它

```bash
npm install
npm run dev          # --host 已開；iPad 同 Wi-Fi 直連
npm run verify       # typecheck → vitest → build → check:audio/assets/font/hosts（CI 與 deploy 都只跑它）
npm run deploy       # verify → wrangler deploy → tools/check-site.sh books.lumenlilt.app
python3 tools/tts.py --book clock --backend azure   # 旁白音檔；金鑰走 .env（見 .env.example）
python3 tools/build-font.py                         # 字型子集（專案 venv：uv venv && uv pip install fonttools brotli）
```

## 硬規則

- **零第三方連線**：CSP `default-src 'self'`；`check-hosts` 對 dist/ 裡任何非白名單主機亮紅。兒童產品，沒有例外。
- **中文字串只住 `content/`**（書本 JSON、`content/ui.json`）；`src/` 不得有 CJK 字面值（註解可以）。理由：字型子集從 content/ 算，散在 src/ 就算不到；`check-font` 會擋。
- **每個第三方素材都要有 `public/assets/LEDGER.json` 條目**，`CREDITS.md` 由它產生、不手寫；`check-assets` 雙向對帳。
- **旁白台詞改了就要重產音檔**：`check-audio` 比對 hash；`--release` 不接受 macOS `say` 產的佔位音檔。
- **金鑰不進 repo**：Azure 金鑰只在 `.env`（gitignore）；正本在 `../profit/config/azure-speech.json`，用 shell 匯出，不複製檔案，也不改 profit 的任何檔案。
- **每支檢查器做完都要故意弄壞一次**證明它會紅（L1 規則⑤）。
- 決定連理由記 `DECISIONS.md`（只加不改）；收工前更新 `STATUS.md` 上半。

## 持久記憶

L2 記憶在 `memory/`，索引 `memory/MEMORY.md`；
L1（關於使用者本人／跨專案）在 `../harness/claude-home/user/`，每 session 由 hook 自動注入；
歷史對話用 `python3 ../harness/tools/session-search.py <關鍵字> --slug kid-books` 查。
結構規範見 [PROJECT-CONVENTION.md](../harness/PROJECT-CONVENTION.md)。
