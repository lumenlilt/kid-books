# 美術需求單 · 魔法書房（AI 生圖用）

> 給出圖的人（使用者）看的規格。程式端已有佔位圖，圖到了直接換檔，不用改程式。
> 風格裁示（2026-09-12）：**柔軟玩具風**——圓潤、粉彩、柔光、像塑膠／絨毛玩具，不是紙雕、不是寫實。

## 風格錨定（每一張提示詞都先貼這段）

```
soft toy style, rounded chunky shapes, pastel palette, matte vinyl toy material, soft studio lighting,
gentle ambient occlusion, clean silhouette, no outlines, no text, no watermark, centered composition,
children's educational app illustration, Taiwanese kindergarten audience
```

負面提示（若工具支援）：`realistic, photo, sharp edges, paper cutout, noise, text, letters, watermark, dark, scary`

調色盤（跟房間色板一致；白天 morning）：
牆 `#fff3d6`、地板 `#d9b27c`、木頭 `#b27a4e`、強調橘 `#ff7f6b`、薄荷 `#7cc7b0`、天空 `#9fd3ff`、紙白 `#ffffff`、墨 `#2f3b4a`、金 `#ffd45a`

## 交付規格

- PNG，sRGB。需要去背的給**透明背景**（工具做不到就純白背景，我本機去背）。
- 檔名照下表，放進 `art/incoming/`。我會壓成 web 用尺寸並登記授權（原創，CC BY 4.0）。
- 每張出 2–3 個變體讓我挑；同一批要**同一個風格種子／參考圖**，不然五本書封面會像五個不同的 App。

## 第一批（時鐘書 + 書架）

| 檔名 | 用途 | 尺寸（px） | 內容 |
|---|---|---|---|
| `cover-clock.png` | 時鐘書封面 | 768×1024 | 一座可愛的圓潤鐘樓，鐘面顯示 3:00，天空有太陽與一朵雲，底部留 1/4 空白給書名 |
| `cover-bopomofo.png` | ㄅㄆㄇ書封面（鎖住時也會露出來） | 768×1024 | 三個圓潤的積木寫著ㄅㄆㄇ（**這三個字要正確**），粉彩色 |
| `cover-numbers.png` | 數一數封面 | 768×1024 | 一籃子蘋果（10 顆）與數字積木 1 2 3 |
| `cover-coins.png` | 買東西封面 | 768×1024 | 小店櫃台、幾枚圓潤的硬幣、一個小豬撲滿 |
| `cover-school.png` | 上學去封面 | 768×1024 | 一個背書包的小孩剪影背影走向學校（不要五官細節） |
| `card-wake.png` `card-school.png` `card-lunch.png` `card-snack.png` `card-sleep.png` | 小明的一天 場景卡圖示 | 512×512 去背 | 起床（床＋太陽）、上學（書包＋校門）、午餐（便當）、點心（餅乾牛奶）、睡覺（床＋月亮）；單一物件、居中 |
| `poster-rainbow.png` | 牆上的海報 | 768×768 | 彩虹＋太陽＋兩朵雲，像小孩畫的但乾淨 |
| `stage-sky.png` | 舞台天空背景（可選） | 1024×640 | 淡藍漸層天空＋幾朵雲，**不要太陽月亮**（程式會畫，要跟時間走） |

## 不要做的

- 不要在圖裡寫字（書名由程式用粉圓字型印，注音那張的三個字是唯一例外）。
- 不要角色臉部特寫（頭像是程式畫的紙偶，風格會打架）。
- 不要邊框、陰影投影到透明區。

## 之後（第二本書「數一數」）

蘋果、籃子、數字積木、各 5–10 個可數的小物件（去背、單一物件）。等第一批對過風格再開。

## 貓（吉祥物）概念圖 — 2026-09-13 新增（✅ 同日收到三視圖 `art/reference/cat-concept.jpg`，已照圖建成 v5，見 DECISIONS D34）

程式建到 v3 仍不夠（使用者裁示），改成「你出概念圖、我照圖建模」。要的東西：

| 檔名 | 內容 | 尺寸 |
|---|---|---|
| `cat-front.png` | 正面、站或坐、中性表情（微笑）、四肢與尾巴都看得到、純色或透明背景 | 1024×1024 |
| `cat-side.png` | 同一隻的側面（或 3/4）——建模要知道身體厚度與尾巴怎麼捲 | 1024×1024 |
| `cat-sheet.png`（可選） | 三視圖或表情表（開心／驚訝／閉眼笑）| 任意 |

提示詞錨定（接在共通那段後面）：
```
mascot design sheet of a chubby orange tabby kitten plush toy, big round head, small pointed ears, simple dot eyes with highlight,
tiny pink nose, w-shaped mouth, cream muzzle and belly, curled tail, red collar with a gold bell, front view, neutral pose,
clean flat background, character design reference
```

要點：**眼睛用簡單的點或杏仁形**（不要真實眼球）、**顏色不超過四種**、**沒有文字**。
另一條路：把正面圖丟 Meshy／Tripo 做 image-to-3D 出 GLB 放 `art/incoming/cat.glb`，我接手處理材質名與動畫節點。
