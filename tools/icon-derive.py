#!/usr/bin/env python3
# verify_by: 2027-03-12
# 圖示衍生：Blender 渲染的 icon-1024.png（透明背景）→ 合成暖色底 → 192／512（圓角）、maskable 512、apple-touch 180。
#   blender --background --python tools/blender/icon.py -- public/assets/models/cat.glb public/icons && python3 tools/icon-derive.py
from pathlib import Path
from PIL import Image, ImageDraw

ICONS = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (252, 236, 200, 255)
src = ICONS / "icon-1024.png"
cat = Image.open(src).convert("RGBA")
base = Image.new("RGBA", cat.size, BG)
base.alpha_composite(cat)


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


for size in (192, 512):
    rounded(base.resize((size, size), Image.LANCZOS), int(size * 0.22)).save(ICONS / f"icon-{size}.png")
maskable = Image.new("RGBA", (512, 512), BG)
inner = base.resize((410, 410), Image.LANCZOS)
maskable.paste(inner, (51, 51))
maskable.save(ICONS / "icon-maskable-512.png")
base.resize((180, 180), Image.LANCZOS).convert("RGB").save(ICONS / "apple-touch-icon.png")
src.unlink()  # 1 MB 的母圖不進 repo，要重生跑 Blender
print("icons:", sorted(p.name for p in ICONS.iterdir()))
