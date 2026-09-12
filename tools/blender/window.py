# verify_by: 2027-03-13
# 窗戶 v2（玩具風，D30）：厚圓邊窗框、深窗台、外框線板＋小山形頂、花箱。天空／山丘／雲／日月仍由 window.ts 畫在框後。
# 開口 1.0×1.15（跟 window.ts 的 width/height 一致），原點在開口中心，前方朝 Blender -Y（glTF +Z）。
# 材質名給 three.js 染色：Frame／Sill／Casing／Flower／Leaf／Box。
#   blender --background --python tools/blender/window.py -- public/assets/models/window.glb
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _toy import arch_board, box, cylinder, export_glb, material, sphere  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = argv[0] if argv else "window.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

FRAME = material("Frame", (1.0, 0.97, 0.92), 0.6)
SILL = material("Sill", (0.79, 0.56, 0.38), 0.7)
CASING = material("Casing", (0.98, 0.9, 0.8), 0.65)
BOX = material("Box", (0.55, 0.36, 0.24), 0.75)
FLOWER = material("Flower", (1.0, 0.45, 0.5), 0.55)
LEAF = material("Leaf", (0.45, 0.75, 0.45), 0.7)

W, H = 1.0, 1.15
bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.active_object
root.name = "Window"

# 內框（貼著開口）與十字窗格
t, d = 0.07, 0.09
box("FrameTop", (W + 2 * t, d, t), (0, 0, H / 2 + t / 2), FRAME, bevel=0.02, parent=root)
box("FrameBottom", (W + 2 * t, d, t), (0, 0, -H / 2 - t / 2), FRAME, bevel=0.02, parent=root)
box("FrameL", (t, d, H), (-W / 2 - t / 2, 0, 0), FRAME, bevel=0.02, parent=root)
box("FrameR", (t, d, H), (W / 2 + t / 2, 0, 0), FRAME, bevel=0.02, parent=root)
box("MullionV", (0.05, d * 0.7, H), (0, 0.01, 0), FRAME, bevel=0.012, parent=root)
box("MullionH", (W, d * 0.7, 0.05), (0, 0.01, 0), FRAME, bevel=0.012, parent=root)

# 外框線板（比內框寬一圈、更往前）＋小山形頂
c = 0.06
box("CasingL", (c, 0.05, H + 2 * t + 0.04), (-W / 2 - t - c / 2, -0.03, 0), CASING, bevel=0.015, parent=root)
box("CasingR", (c, 0.05, H + 2 * t + 0.04), (W / 2 + t + c / 2, -0.03, 0), CASING, bevel=0.015, parent=root)
box("CasingTop", (W + 2 * t + 2 * c, 0.05, c), (0, -0.03, H / 2 + t + c / 2), CASING, bevel=0.015, parent=root)
arch_board("Pediment", W + 2 * t + 2 * c + 0.06, 0.05, 0.07, 0.1, (0, -0.03, H / 2 + t + c + 0.035), CASING, parent=root)

# 深窗台
box("Sill", (W + 2 * t + 2 * c + 0.1, 0.2, 0.06), (0, -0.06, -H / 2 - t - 0.03), SILL, bevel=0.02, parent=root)

# 花箱：掛在窗台下方前緣
box("FlowerBox", (0.62, 0.15, 0.14), (0, -0.14, -H / 2 - t - 0.13), BOX, bevel=0.02, parent=root)
for i, x in enumerate((-0.2, 0.0, 0.2)):
    cylinder(f"Stem{i}", 0.01, 0.12, (x, -0.14, -H / 2 - t - 0.0), LEAF, verts=8, bevel=0.0, parent=root)
    sphere(f"Flower{i}", 0.055, (x, -0.14, -H / 2 - t + 0.06), FLOWER, parent=root)
    sphere(f"Leaf{i}", 0.035, (x + 0.05, -0.12, -H / 2 - t - 0.02), LEAF, scale=(1, 0.6, 0.7), parent=root)

export_glb(OUT)
