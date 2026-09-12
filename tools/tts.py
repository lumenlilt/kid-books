#!/usr/bin/env python3
# verify_by: 2027-03-12
# 旁白音檔：content/books/*.json 的 lines → public/audio/<book>/<lineId>.mp3 ＋ public/audio/manifest.json。
#
#   python3 tools/tts.py --backend say            # 開發用：macOS 內建 Meijia（release 檢查會擋）
#   python3 tools/tts.py --backend azure          # 正式：zh-TW-HsiaoChenNeural；金鑰走環境變數
#   python3 tools/tts.py --backend azure --only clock --force --dry-run
#
# 為什麼一句一檔＋manifest 記 hash：台詞改了但音檔沒重產，小孩聽到的是舊句子而畫面不會告訴你；
# tools/check-audio.mjs 比對 textSha256，--release 時任何一句不是 azure 產的就紅。
# Azure zh-TW 的聲音沒有語氣風格（express-as 會被靜默忽略），只用 prosody 調音高語速（DECISIONS D09）。
import argparse, datetime, hashlib, json, os, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "content" / "books"
OUT = ROOT / "public" / "audio"
MANIFEST = OUT / "manifest.json"

VOICES = {
    "say": {"voice": "Meijia", "params": {"rate": 175}},
    "azure": {"voice": "zh-TW-HsiaoChenNeural", "params": {"pitch": "+6%", "rate": "-6%", "format": "audio-24khz-96kbitrate-mono-mp3"}},
}


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def loudnorm_to_mp3(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ac", "1", "-ar", "44100", "-b:a", "64k", str(dst)], check=True)


def duration_ms(path: Path) -> int:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return int(float(out) * 1000)


def synth_say(text: str, dst: Path, cfg: dict) -> None:
    with tempfile.TemporaryDirectory() as td:
        aiff = Path(td) / "line.aiff"
        subprocess.run(["say", "-v", cfg["voice"], "-r", str(cfg["params"]["rate"]), "-o", str(aiff), text], check=True)
        loudnorm_to_mp3(aiff, dst)


def synth_azure(text: str, dst: Path, cfg: dict) -> None:
    key = os.environ.get("AZURE_SPEECH_KEY")
    region = os.environ.get("AZURE_SPEECH_REGION", "eastasia")
    if not key:
        raise SystemExit("✘ 缺 AZURE_SPEECH_KEY（不會默默改用 say；要開發用請明確指定 --backend say）")
    p = cfg["params"]
    ssml = (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">'
            f'<voice name="{cfg["voice"]}"><prosody pitch="{p["pitch"]}" rate="{p["rate"]}">{escape(text)}</prosody></voice></speak>')
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"), method="POST",
        headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml; charset=utf-8",
                 "X-Microsoft-OutputFormat": p["format"], "User-Agent": "kid-books-tts"})
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            break
        except Exception as e:  # noqa: BLE001
            last = e
    else:
        raise SystemExit(f"✘ Azure 失敗三次：{last}")
    with tempfile.TemporaryDirectory() as td:
        raw = Path(td) / "line.mp3"
        raw.write_bytes(data)
        loudnorm_to_mp3(raw, dst)


def escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", choices=list(VOICES), required=True)
    ap.add_argument("--only", help="只做某本書 id")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    cfg = VOICES[a.backend]
    synth = synth_say if a.backend == "say" else synth_azure
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"lines": {}}
    lines = manifest.setdefault("lines", {})
    made = skipped = 0
    seen = set()
    for bp in sorted(BOOKS.glob("*.json")):
        book = json.loads(bp.read_text(encoding="utf-8"))
        if a.only and book["id"] != a.only:
            continue
        for line_id, text in book.get("lines", {}).items():
            key = f"{book['id']}.{line_id}"
            seen.add(key)
            h = sha(f"{a.backend}|{cfg['voice']}|{json.dumps(cfg['params'], sort_keys=True)}|{text}")[:16]
            dst = OUT / book["id"] / f"{line_id}.mp3"
            entry = lines.get(key)
            if entry and entry.get("hash") == h and dst.exists() and not a.force:
                skipped += 1
                continue
            print(f"{'(dry) ' if a.dry_run else ''}{key}: {text[:24]}…")
            if a.dry_run:
                continue
            synth(text, dst, cfg)
            lines[key] = {
                "file": str(dst.relative_to(ROOT / "public")), "textSha256": sha(text), "hash": h,
                "backend": a.backend, "voice": cfg["voice"], "params": cfg["params"],
                "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                "durationMs": duration_ms(dst),
            }
            made += 1
    if not a.dry_run:
        # 只有 --only 時才保留其他書的條目；否則清掉孤兒
        if not a.only:
            for k in list(lines):
                if k not in seen:
                    del lines[k]
        OUT.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✔ {a.backend}：產 {made} 句、略過 {skipped} 句")
    return 0


if __name__ == "__main__":
    sys.exit(main())
