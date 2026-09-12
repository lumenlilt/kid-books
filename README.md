# 魔法書房 · Magic Bookroom

給幼稚園到國小低年級小朋友的 3D 書架：點一本書，書會翻開、紙雕場景從書頁立起來，
旁白帶著小孩玩一個「幼小銜接」主題。每完成一頁得一顆星，讀完一本書，房間裡就多一件收藏。

**狀態：建置中（M0 骨架）。** 第一本書是「認識時鐘：整點與半點」（108 課綱數學 N-1-6）。
上線位置：<https://books.lumenlilt.app>（尚未部署）。

A 3D pop-up bookshelf for kids aged 4–7, built for Taiwan's kindergarten-to-first-grade curriculum.
Three.js stage + DOM controls, iPad-first, zero accounts, zero tracking.

## 對家長的承諾

- 沒有帳號、沒有廣告、沒有追蹤、沒有第三方連線（建置檢查會擋，CSP 只允許自己）。
- 進度只存在裝置裡（localStorage）；最多四個小孩各自的進度。
- 沒有計時、沒有失敗畫面、沒有「連續登入」那類讓小孩焦慮的機制。

## 怎麼跑

```bash
npm install
npm run dev        # http://localhost:5173，--host 已開，iPad 在同一個 Wi-Fi 可以直接連
npm run verify     # typecheck → vitest → build → 四支檢查（音檔、素材帳、字型字集、零外連）
```

旁白音檔由 `tools/tts.py` 產生（Azure Speech zh-TW；金鑰放 `.env`，不進版控），
字型子集由 `tools/build-font.py` 產生。兩者的產出都進 repo，clone 下來就能跑。

## 結構

- `content/`：書本內容（一本書一個 JSON：頁面、活動設定、旁白台詞）——**中文字串只住這裡**。
- `src/scene/`：Three.js 房間、書架、立體書、道具；`src/activities/`：活動元件（外掛式）；`src/overlay/`：DOM 控制層。
- `tools/`：產生器與檢查器；`docs/`：計畫與設計文件；`DECISIONS.md`：決定與理由。

## 授權

程式碼 MIT（`LICENSE`）；課程內容與原創美術 CC BY 4.0（`LICENSE-CONTENT`）；
第三方素材見 `CREDITS.md`。
