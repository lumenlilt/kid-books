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
- **M5 播放端完成**（2026-09-12）：`app/audio.ts`（Howler：旁白一次一句可打斷、SFX 12 個 Kenney、靜音、首次手勢解鎖、
  每幀 seek 判播完、沒解鎖就退回估時）、貓嘴隨音量、SFX 接到每個互動點。音檔仍是 say 佔位（等 Azure 金鑰）。
- **M6 PWA＋部署完成**（2026-09-12）：manifest、Blender 渲染的貓圖示、自製 service worker（70 檔 2.2 MB 預快取）、
  `wrangler deploy` → **https://books.lumenlilt.app 上線**，`check-site.sh` 標題／CSP／manifest 綠。
  首次部署抓到 Cloudflare zone 層級的 Web Analytics 自動注入（CSP 擋下）與 NEL 標頭——探針已寫進 check-site，**要使用者到 dashboard 關**。
- **畫面商用化第一輪**（2026-09-12，commit 0d66393，已部署）：使用者裁示「還沒到商用」→ 先做風格無關的光影（VSM 軟陰影、三點光＋窗光、
  RoomEnvironment、Neutral 色調、紙紋）與擺設（彩旗、窗簾、雲朵吊飾、海報、木地板、地毯、護牆板、窗外山丘雲）、封面圖樣、舞台細節；
  `?ao=1` 可開 GTAO 比較。使用者看過後裁示**柔軟玩具風**（D27）。
- **柔軟玩具風第一輪**（2026-09-12，commit 79037a6，已部署）：圓角盒＋倒角、霧面塑膠材質、GTAO 預設開、自製圓潤擺設（Kenney 家具移除）、
  貓耳尾細分。`art/BRIEF.md` 寫好，等使用者出第一批 AI 圖（封面 ×5、場景卡 ×5、海報、舞台天空）。
- **美術第二輪**（2026-09-12，D28，已部署）：玩具著色 shader（漸層＋邊光）、貓 v2＋新圖示、窗光光柱與浮塵、舞台樹／籬笆／漸層天空／夜光窗、
  積木與球、按鈕漸層。程序美術到此接近天花板，再上去要靠 AI 圖或人畫。
- **美術第三輪**（2026-09-13，D29，已部署）：Poly Haven CC0 貼圖（地板／牆／地毯／木紋）、3/4 構圖、更強主光。
  KayKit 家具包腳本下載不到（itch.io key 檢查），**請使用者手動下載免費版放 `art/incoming/`**。
- **美術第四輪**（2026-09-13，D30，已部署）：書架與窗戶改 Blender 建模（腳本可重生、材質名染色板）。
- **美術第五輪**（2026-09-13，D31，已部署）：邊桌、落地燈、盆栽、小熊、收音機、書堆改 Blender 建模；KayKit 不再需要。
- **美術第六輪**（2026-09-13，D32，已部署）：舞台的鐘樓、小屋、樹、籬笆、灌木改 Blender 建模。房間與舞台的物件至此全是設計過的模型；
  剩下最陽春的是**書本封面**（等 AI 圖）。
- **貓 v3**（2026-09-13，D33，已部署）：使用者說 v2 很奇怪 → metaball 絨毛玩偶、臉貼表面、尖耳；圖示重渲染。
  **使用者看過 v3 仍裁示不行 → 改「使用者出概念圖、我照圖建模」**，規格在 `art/BRIEF.md`〈貓（吉祥物）概念圖〉。
- **貓 v5**（2026-09-13，D34，**未部署**）：使用者出了三視圖概念圖 → 乾淨零件＋解析投影貼片重建（`tools/blender/cat.py`），
  圖示重渲染；比對圖 `cat-v5-review-sheet.png` 已交給使用者。**等使用者點頭才 `npx wrangler deploy`**。
  順手加了 dev 截圖收件匣（`__kb.dbg.snapshot('name')` → `.shots/name.png`），之後看畫面、出 README 截圖都用它。
- **手機首開空白（D35）**（2026-09-13）：使用者說前一版手機不能操作 → iOS 模擬器重現是「首屏前十幾秒零回饋」→ 開機畫面＋SW 延後＋
  面板印錯誤＋`?pick=&open=` 自動走位。模擬器 1 秒有畫面、3 秒書架。**真機觸控未實測**（模擬器點擊權限沒拿到），等使用者手機回報。

## 下一步

1. **等使用者**：(a) Azure 金鑰重產 → 我產四段聲線樣本讓他選 → 全量重產 → 重新部署；
   (b) Cloudflare dashboard 關掉 Web Analytics 自動注入與 NEL（`check-site.sh` 會亮紅直到關掉）；
   (c) 依 `art/BRIEF.md` 出第一批 AI 圖放 `art/incoming/`；~~(c′) 貓的概念圖~~ 已收到、v5 建好、使用者點頭部署（書角抬頭 15° 一起）；
   (e) ~~KayKit~~ 擺設已全部自製，不用下載了；
   (d) 看過玩具風成品，決定再修哪裡（候選：頁與頁的翻頁動畫、鐘樓構圖、點數字讓指針走過去、直向控制區、貓的造型）。
2. 使用者用 iPad Safari 開 https://books.lumenlilt.app 實際玩一遍（加入主畫面），回報手感、台詞、聲音。
3. 自家小孩實測（M3 就該排的）：我出 10 分鐘觀察表。
4. 之後：第二本書選題（先量既有六種活動元件能表達多少頁，D16）、Playwright 煙霧測試、直向控制區再調。

## 等使用者裁示

- Azure Speech 金鑰：`profit/config/azure-speech.json` 那把回 401；使用者說要去重產。
- Cloudflare zone 開關：Web Analytics 自動注入、Network Error Logging——只有 dashboard 關得掉。

---

## 自動記錄的狀態

<!-- HANDOFF-AUTO:BEGIN -->
<!-- state:main|ce4227f|dirty -->
> ⚠️ 這一段由 `harness/hooks/status-handoff.py` 自己寫，不要手改。

更新於 **2026-09-13 00:54**｜分支 `main`｜HEAD `ce4227f` art/BRIEF：貓的概念圖規格；STATUS：等使用者出圖再照圖建模｜工作樹：**有未提交的改動**（`git status --short`）
<!-- HANDOFF-AUTO:END -->
