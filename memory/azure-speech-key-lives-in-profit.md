---
name: azure-speech-key-lives-in-profit
description: 旁白用的 Azure Speech 金鑰不在本專案，在 profit/config/azure-speech.json（region eastasia），tts.py 走環境變數讀它
metadata:
  type: project
  volatile: true
  verify_by: 2026-12-12
---

Azure Speech 的金鑰與區域正本在 `~/Projects/Claude/profit/config/azure-speech.json`
（欄位 key／region＝eastasia／voice＝zh-TW-HsiaoChenNeural，2026-09-12 確認存在）；
`profit/lib/tts_azure.py` 有現成的 REST 寫法可借鏡。

**Why:** 2026-09-12 規劃時本來要請使用者開新帳號，規劃 agent 發現既有金鑰；本專案是公開 repo，
金鑰只能走 `.env`／環境變數，不能複製那個檔案進來。
**How to apply:** 產音檔前 `export AZURE_SPEECH_KEY=$(python3 -c 'import json;print(json.load(open("../profit/config/azure-speech.json"))["key"])')`
之類的一行匯出；不要改 profit 的任何檔案。金鑰若換過，這條就過期——先 `ls` 確認再用。
