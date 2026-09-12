# verify_by: 2027-03-13
# 書架 v2（玩具風，D30）：厚圓邊側板、弧頂冠板、底座四隻圓腳、層板前唇、淺色內裡。
# 尺寸與 src/scene/bookcase.ts 的格位一致：寬 1.8、高 1.78、深 0.42，書層頂面 y=0.98、下層 y=0.42。
# 前方朝 Blender -Y（glTF 匯出後是 +Z，跟房間座標一致）。材質名是給 three.js 依色板染色的介面：Wood／WoodDark／Inner／Trim。
#   blender --background --python tools/blender/bookcase.py -- public/assets/models/bookcase.glb
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _toy import arch_board, box, cylinder, export_glb, material, set_parent  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = argv[0] if argv else "bookcase.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

WOOD = material("Wood", (0.79, 0.56, 0.38), 0.7)
WOOD_DARK = material("WoodDark", (0.64, 0.43, 0.28), 0.75)
INNER = material("Inner", (1.0, 0.96, 0.9), 0.85)
TRIM = material("Trim", (1.0, 0.5, 0.42), 0.6)

W, H, D = 1.8, 1.78, 0.42
T = 0.07  # 側板厚
bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.active_object
root.name = "Bookcase"

# 底座（略縮）＋四隻圓腳
box("Plinth", (W - 0.06, D - 0.04, 0.08), (0, 0, 0.1), WOOD_DARK, bevel=0.025, parent=root)
for sx in (-1, 1):
    for sy in (-1, 1):
        cylinder(f"Foot{sx}{sy}", 0.05, 0.06, (sx * (W / 2 - 0.16), sy * (D / 2 - 0.12), 0.03), WOOD_DARK, verts=20, bevel=0.015, parent=root)

# 側板：厚、圓邊
for sx, name in ((-1, "SideL"), (1, "SideR")):
    box(name, (T, D, H - 0.14), (sx * (W / 2 - T / 2), 0, 0.14 + (H - 0.14) / 2), WOOD, bevel=0.03, parent=root)

# 背板：淺色內裡（書會跳出來）
box("Back", (W - 2 * T + 0.02, 0.03, H - 0.2), (0, D / 2 - 0.02, 0.14 + (H - 0.2) / 2), INNER, bevel=0.0, parent=root)

# 層板：書層頂面 0.98、下層頂面 0.42，前唇略厚
for name, top in (("ShelfBooks", 0.98), ("ShelfLow", 0.42)):
    box(name, (W - 2 * T + 0.01, D - 0.06, 0.05), (0, 0.01, top - 0.025), WOOD, bevel=0.018, parent=root)
    box(f"{name}Lip", (W - 2 * T + 0.01, 0.035, 0.07), (0, -(D / 2) + 0.05, top - 0.035), WOOD, bevel=0.015, parent=root)

# 頂板＋弧頂冠板＋一條強調色飾條
box("Top", (W, D, 0.06), (0, 0, H - 0.03), WOOD, bevel=0.025, parent=root)
arch_board("Crown", W + 0.04, 0.05, 0.06, 0.08, (0, -(D / 2) + 0.03, H + 0.03), WOOD, parent=root)  # 矮一點，貓坐在後面還看得到
box("TrimStrip", (W - 0.3, 0.02, 0.025), (0, -(D / 2) - 0.005, H - 0.075), TRIM, bevel=0.008, parent=root)

# 小圓釘裝飾（側板正面）
for sx in (-1, 1):
    for z in (0.35, 0.9, 1.45):
        cylinder(f"Knob{sx}{int(z * 100)}", 0.02, 0.02, (sx * (W / 2 - T / 2), -(D / 2) - 0.008, z), TRIM, rot=(1.5708, 0, 0), verts=16, bevel=0.005, parent=root)

export_glb(OUT)
