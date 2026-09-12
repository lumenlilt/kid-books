# kid-books · 現在到哪了

> **新 session 打「繼續」時先讀這一份**，再看 `BACKLOG.md`。
> 上半（進行中／下一步／等裁示）是**人寫的**；`HANDOFF-AUTO` 那一段由
> `harness/hooks/status-handoff.py` **自己寫**，不要手改。
> ⚠️ 兩半分開是刻意的：機器寫得出「工作樹髒著、HEAD 是哪一個」，
> 寫不出「為什麼在做這件事」；而只有機器寫的那半不會因為有人忘記而變成謊話。

## 進行中

- **M0 骨架完成**（2026-09-12，commit b462b28）：verify 全綠、四支檢查器各弄壞一次證明會紅、
  Browser pane 直橫向 canvas 尺寸都對。計畫正本 `docs/PLAN-2026-09-12.md`（M0–M6 與完成定義）。
- **M1 房間＋書架**（進行中，2026-09-12）：房間、程式化書架、封面朝外的書（1 真＋4 鎖）、Kenney 擺設、
  三個虛線裝飾空位、窗外依真實時間變天色、色板跟時間走（白天 morning／傍晚後 dusk，使用者裁示）、
  Blender bpy 生成的貓（`tools/blender/cat.py`，使用者要求重做）、HUD 骨架、字型子集管線（21 KB）。
  verify 全綠。**未驗證**：iPad 實機觸控手感、fps（Browser pane 隱藏時 rAF 不跑）。
- **M2 開書＋立體書完成**（2026-09-12）：點書→滑出→飛到閱讀位（同時鏡頭過去）→翻開→紙雕三層隨角度立起→
  DOM 矩形貼書→貓跳到書角；返回鍵反向；狀態機表格化＋vitest；直橫向轉向後矩形重算；開闔三次 geometries 回到基準。
  合成 pointer 事件驗過點書路徑；真正的觸控手感仍要實機。
- **M3 時鐘活動完成**（2026-09-12）：`content/books/clock.json`（七頁、33 句台詞，zod＋跨參照驗證）、
  SVG 時鐘控制器（拖、吸附、分針帶時針、示範幽靈指針）、六種活動元件、提示階梯、星星爆開、旁白（字幕＋估時）、
  `tools/tts.py`（say 佔位音檔已產 33 句；azure 後端寫好待跑）。在隱藏的 Browser pane 用 `?turbo=1` 走完整本七頁。
- **M4 獎勵與人物完成**（2026-09-12）：`app/store.ts`（localStorage 一把 key、版本化遷移、最多四位、注入式 storage＋測試）、
  選角畫面（四個紙偶 SVG）、HUD 頭像（短按換人、長按家長報告）、讀完書→鏡頭帶去看牆上登場的咕咕鐘（鐘擺、真實時間、鳥探頭）、
  書脊金書籤、本機家長報告（每頁星／重試／讀完日期）。重新載入後進度與裝飾都從 store 推導。

## 下一步

1. **等使用者**：Azure 金鑰失效（401），使用者去入口網站重產／確認區域 → 我產四段聲線樣本讓他選 → 全量重產。
2. M5 播放端：Howler、iOS 首次觸碰解鎖（選角那一下）、旁白打斷、貓嘴隨音量、SFX 接上（Kenney）。
3. M6 PWA＋部署：manifest、圖示、service worker、`wrangler deploy`、`check-site.sh`、README。
4. 使用者在 Browser pane 打開 `http://localhost:64169/?hour=10` 實際玩一遍時鐘書，回報手感與台詞。

## 等使用者裁示

- Azure Speech 金鑰：`profit/config/azure-speech.json` 那把回 401；使用者說要去重產。
