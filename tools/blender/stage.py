# verify_by: 2027-03-13
# 立體書舞台（時鐘書）的物件（玩具風，D32）：鐘樓、小屋、樹、籬笆、灌木。一個一個 GLB，建在原點、底部貼地、前方朝 Blender -Y（glTF +Z）。
# 鐘面的指針由 three.js 畫：鐘面中心在鐘樓的 (0, 0.36, 前面 +0.16)（glTF 座標），clock-stage.ts 照這個數字放指針。
#   for p in tower house tree fence bush; do blender --background --python tools/blender/stage.py -- $p public/assets/models/stage-$p.glb; done
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _toy import box, cone, cylinder, export_glb, material, sphere, torus  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
WHICH = argv[0] if argv else "tower"
OUT = argv[1] if len(argv) > 1 else f"stage-{WHICH}.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

WALL = material("Wall", (0.98, 0.9, 0.75), 0.75)
WALL_DARK = material("WallDark", (0.9, 0.78, 0.6), 0.75)
ROOF = material("Roof", (0.85, 0.33, 0.31), 0.65)
ROOF_DARK = material("RoofDark", (0.7, 0.25, 0.25), 0.65)
DOOR = material("Door", (0.55, 0.36, 0.24), 0.75)
GLOW = material("Glow", (1.0, 0.95, 0.66), 0.5)
CLOCK_FACE = material("ClockFace", (1.0, 0.99, 0.96), 0.6)
CLOCK_RIM = material("ClockRim", (0.55, 0.36, 0.24), 0.6)
GOLD = material("Gold", (1.0, 0.83, 0.35), 0.45)
TRUNK = material("Trunk", (0.55, 0.36, 0.24), 0.8)
LEAF = material("Leaf", (0.44, 0.75, 0.45), 0.7)
LEAF_DARK = material("LeafDark", (0.31, 0.62, 0.35), 0.7)
FENCE = material("Fence", (1.0, 0.96, 0.9), 0.7)

bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.active_object
root.name = f"stage-{WHICH}"

if WHICH == "tower":
    box("Body", (0.3, 0.3, 0.55), (0, 0, 0.275), WALL, bevel=0.03, parent=root)
    box("Band", (0.34, 0.34, 0.05), (0, 0, 0.55), WALL_DARK, bevel=0.015, parent=root)
    cone("Roof", 0.2, 0.02, 0.2, (0, 0, 0.67), ROOF, verts=32, bevel=0.012, parent=root)
    torus("RoofRim", 0.195, 0.015, (0, 0, 0.575), ROOF_DARK, parent=root)
    sphere("Finial", 0.03, (0, 0, 0.8), GOLD, parent=root)
    cylinder("Pole", 0.006, 0.14, (0, 0, 0.86), TRUNK, verts=8, bevel=0.0, parent=root)
    box("Flag", (0.07, 0.006, 0.045), (0.04, 0, 0.9), GOLD, bevel=0.004, parent=root)
    # 鐘面：外環＋面（指針由程式畫在 (0, 0.36, +0.16)）
    cylinder("ClockRim", 0.13, 0.03, (0, -0.16, 0.36), CLOCK_RIM, rot=(math.radians(90), 0, 0), verts=40, bevel=0.008, parent=root)
    cylinder("ClockFace", 0.115, 0.02, (0, -0.165, 0.36), CLOCK_FACE, rot=(math.radians(90), 0, 0), verts=40, bevel=0.004, parent=root)
    for i in range(12):
        a = math.radians(i * 30)
        big = i % 3 == 0
        box(f"Tick{i}", (0.02 if big else 0.012, 0.006, 0.03 if big else 0.018), (math.sin(a) * 0.095, -0.178, 0.36 + math.cos(a) * 0.095), CLOCK_RIM, bevel=0.002, parent=root)
        bpy.context.active_object.rotation_euler = (0, -a, 0)
    box("Door", (0.09, 0.02, 0.14), (0, -0.155, 0.07), DOOR, bevel=0.015, parent=root)
    sphere("DoorKnob", 0.008, (0.03, -0.168, 0.07), GOLD, parent=root)
    for wx in (-0.085, 0.085):
        box(f"Win{int(wx * 100)}", (0.05, 0.02, 0.06), (wx, -0.155, 0.2), GLOW, bevel=0.01, parent=root)
        box(f"WinFrame{int(wx * 100)}", (0.062, 0.012, 0.072), (wx, -0.151, 0.2), WALL_DARK, bevel=0.006, parent=root)

elif WHICH == "house":
    box("Body", (0.28, 0.24, 0.2), (0, 0, 0.1), WALL, bevel=0.025, parent=root)
    cone("Roof", 0.23, 0.02, 0.17, (0, 0, 0.285), ROOF, verts=4, bevel=0.03, parent=root)
    bpy.context.active_object.rotation_euler = (0, 0, math.radians(45))
    box("Chimney", (0.045, 0.045, 0.1), (-0.08, 0.04, 0.3), ROOF_DARK, bevel=0.012, parent=root)
    box("Door", (0.06, 0.02, 0.1), (0.05, -0.125, 0.05), DOOR, bevel=0.012, parent=root)
    sphere("Knob", 0.007, (0.07, -0.137, 0.05), GOLD, parent=root)
    box("Win", (0.05, 0.02, 0.05), (-0.07, -0.125, 0.11), GLOW, bevel=0.01, parent=root)
    box("WinFrame", (0.062, 0.012, 0.062), (-0.07, -0.121, 0.11), WALL_DARK, bevel=0.006, parent=root)
    box("Step", (0.1, 0.05, 0.02), (0.05, -0.15, 0.01), WALL_DARK, bevel=0.008, parent=root)

elif WHICH == "tree":
    cylinder("Trunk", 0.022, 0.16, (0, 0, 0.08), TRUNK, verts=12, bevel=0.006, parent=root)
    sphere("Canopy1", 0.09, (0, 0, 0.2), LEAF, parent=root)
    sphere("Canopy2", 0.065, (0.05, -0.02, 0.27), LEAF_DARK, parent=root)
    sphere("Canopy3", 0.06, (-0.05, 0.01, 0.26), LEAF_DARK, parent=root)
    sphere("Canopy4", 0.05, (0, 0, 0.32), LEAF, parent=root)

elif WHICH == "fence":
    for i in range(5):
        box(f"Post{i}", (0.03, 0.03, 0.12), (-0.18 + i * 0.09, 0, 0.06), FENCE, bevel=0.01, parent=root)
        sphere(f"Cap{i}", 0.02, (-0.18 + i * 0.09, 0, 0.125), FENCE, parent=root)
    for z in (0.04, 0.085):
        box(f"Rail{int(z * 1000)}", (0.42, 0.02, 0.02), (0, 0, z), FENCE, bevel=0.007, parent=root)

elif WHICH == "bush":
    sphere("B1", 0.07, (0, 0, 0.06), LEAF, scale=(1, 0.9, 0.8), parent=root)
    sphere("B2", 0.055, (0.06, -0.01, 0.05), LEAF_DARK, scale=(1, 0.9, 0.8), parent=root)
    sphere("B3", 0.05, (-0.055, 0.01, 0.05), LEAF_DARK, scale=(1, 0.9, 0.8), parent=root)

export_glb(OUT)
