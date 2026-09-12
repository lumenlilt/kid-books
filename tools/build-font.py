#!/usr/bin/env python3
# verify_by: 2027-03-12
# 字型子集：把 content/ 裡真正用到的字（中日韓、注音、全形標點）＋ ASCII 從 jf open 粉圓 子集成 woff2。
# 為什麼：整套 CJK 字型 8.5 MB，子集 100–200 KB；而缺字會靜默退回系統字型，所以 manifest 記字集、
# tools/check-font.mjs 比對。字型正本不進 repo（keep-results-not-inputs），放在 FONT_SRC 或 ~/.cache。
#
#   uv venv .venv && uv pip install --python .venv/bin/python fonttools brotli   # 一次
#   .venv/bin/python tools/build-font.py
#
# 來源：https://github.com/justfont/open-huninn-font/releases（2.1，OFL 1.1）
import hashlib, json, os, re, subprocess, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "assets" / "fonts"
SRC = Path(os.environ.get("FONT_SRC") or Path.home() / ".cache" / "kid-books" / "jf-openhuninn-2.1.ttf")
VERSION = "2.1"
# 與 tools/check-font.mjs 的 GLYPH_RANGE 一致：中日韓統一表意、擴充 A、注音、CJK 標點、全形、相容表意
GLYPH_RE = re.compile(r"[⺀-⿟　-〿㄀-ㄯㆠ-ㆿ㐀-䶿一-鿿豈-﫿＀-￯]")

def collect(v, out: set):
    if isinstance(v, str):
        out.update(GLYPH_RE.findall(v))
    elif isinstance(v, list):
        for x in v: collect(x, out)
    elif isinstance(v, dict):
        for x in v.values(): collect(x, out)

def main() -> int:
    if not SRC.exists():
        print(f"✘ 找不到字型正本 {SRC}\n  下載 jf-openhuninn-{VERSION}.ttf 放到那裡，或設 FONT_SRC=<路徑>", file=sys.stderr)
        return 1
    try:
        import fontTools  # noqa: F401
        import brotli  # noqa: F401
    except ImportError as e:
        print(f"✘ 缺 {e.name}：uv venv .venv && uv pip install --python .venv/bin/python fonttools brotli", file=sys.stderr)
        return 1
    glyphs: set = set()
    for p in sorted((ROOT / "content").rglob("*.json")):
        collect(json.loads(p.read_text(encoding="utf-8")), glyphs)
    ascii_set = "".join(chr(c) for c in range(0x20, 0x7F))
    text = ascii_set + "".join(sorted(glyphs))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "huninn-subset.woff2"
    text_file = OUT_DIR / ".glyphs.txt"
    text_file.write_text(text, encoding="utf-8")
    cmd = [sys.executable, "-m", "fontTools.subset", str(SRC), f"--text-file={text_file}", "--flavor=woff2",
           "--layout-features=*", "--no-hinting", "--desubroutinize", f"--output-file={out}"]
    subprocess.run(cmd, check=True)
    text_file.unlink()
    sha = hashlib.sha256("".join(sorted(glyphs)).encode("utf-8")).hexdigest()
    manifest = {
        "font": "jf open 粉圓 (jf-openhuninn)", "version": VERSION, "license": "OFL-1.1",
        "source": "https://github.com/justfont/open-huninn-font/releases",
        "glyphs": "".join(sorted(glyphs)), "glyphsSha256": sha, "ascii": True,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "bytes": out.stat().st_size,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✔ {out.relative_to(ROOT)}：{len(glyphs)} 個 CJK 字＋ASCII，{out.stat().st_size/1024:.0f} KB")
    return 0

if __name__ == "__main__":
    sys.exit(main())
