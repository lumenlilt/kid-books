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
