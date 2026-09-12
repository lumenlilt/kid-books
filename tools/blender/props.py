# verify_by: 2027-03-13
# 房間擺設（玩具風，D31）：一個擺設一個 GLB，全部建在原點、底部貼地、前方朝 Blender -Y（glTF +Z）。
# 材質名是 three.js 染色板的介面（Wood／WoodDark／Shade／Bulb／Pot／Leaf／LeafDark／Fur／Cream／Ink／Bow／Body／Grill／Knob／Gold／Book1／Book2／Book3）。
#   for p in sidetable floorlamp plant bear radio bookstack; do blender --background --python tools/blender/props.py -- $p public/assets/models/prop-$p.glb; done
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _toy import box, cone, cylinder, export_glb, material, set_parent, sphere, torus  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
WHICH = argv[0] if argv else "sidetable"
OUT = argv[1] if len(argv) > 1 else f"{WHICH}.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

WOOD = material("Wood", (0.79, 0.56, 0.38), 0.7)
WOOD_DARK = material("WoodDark", (0.64, 0.43, 0.28), 0.75)
SHADE = material("Shade", (1.0, 0.5, 0.42), 0.6)
BULB = material("Bulb", (1.0, 0.95, 0.7), 0.4)
POT = material("Pot", (0.49, 0.78, 0.69), 0.7)
LEAF = material("Leaf", (0.44, 0.75, 0.45), 0.7)
LEAF_DARK = material("LeafDark", (0.31, 0.62, 0.35), 0.7)
FUR = material("Fur", (0.85, 0.63, 0.4), 0.85)
CREAM = material("Cream", (0.96, 0.87, 0.75), 0.85)
INK = material("Ink", (0.17, 0.13, 0.12), 1.0)
BOW = material("Bow", (1.0, 0.5, 0.42), 0.6)
BODY = material("Body", (1.0, 0.5, 0.42), 0.6)
GRILL = material("Grill", (1.0, 0.97, 0.92), 0.7)
KNOB = material("Knob", (0.17, 0.13, 0.12), 0.6)
GOLD = material("Gold", (1.0, 0.83, 0.35), 0.45)
BOOKS = [material("Book1", (1.0, 0.5, 0.42), 0.7), material("Book2", (0.62, 0.83, 1.0), 0.7), material("Book3", (0.49, 0.78, 0.69), 0.7)]

bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.active_object
root.name = WHICH

if WHICH == "sidetable":
    # 圓桌面＋三隻外八腳＋下層小圓盤
    cylinder("Top", 0.34, 0.06, (0, 0, 0.52), WOOD, verts=40, bevel=0.02, parent=root)
    cylinder("Rim", 0.36, 0.03, (0, 0, 0.5), WOOD_DARK, verts=40, bevel=0.012, parent=root)
    cylinder("LowShelf", 0.2, 0.03, (0, 0, 0.2), WOOD, verts=32, bevel=0.01, parent=root)
    for i in range(3):
        a = math.radians(90 + i * 120)
        x, y = math.cos(a) * 0.22, math.sin(a) * 0.22
        cylinder(f"Leg{i}", 0.03, 0.5, (x, y, 0.25), WOOD_DARK, rot=(math.radians(-8) * math.sin(a), math.radians(8) * math.cos(a), 0), verts=16, bevel=0.01, parent=root)
        sphere(f"Foot{i}", 0.04, (x * 1.15, y * 1.15, 0.03), WOOD_DARK, parent=root)

elif WHICH == "floorlamp":
    cylinder("Base", 0.18, 0.06, (0, 0, 0.03), WOOD_DARK, verts=40, bevel=0.02, parent=root)
    cylinder("Pole", 0.025, 1.1, (0, 0, 0.6), WOOD_DARK, verts=16, bevel=0.008, parent=root)
    sphere("Bulb", 0.07, (0, 0, 1.2), BULB, parent=root)
    cone("Shade", 0.26, 0.14, 0.32, (0, 0, 1.3), SHADE, verts=40, bevel=0.015, parent=root)
    torus("ShadeRim", 0.26, 0.015, (0, 0, 1.14), SHADE, parent=root)
    sphere("Finial", 0.03, (0, 0, 1.48), GOLD, parent=root)

elif WHICH == "plant":
    cone("Pot", 0.13, 0.17, 0.26, (0, 0, 0.13), POT, verts=36, bevel=0.015, parent=root)
    torus("PotRim", 0.17, 0.022, (0, 0, 0.26), POT, parent=root)
    cylinder("Soil", 0.15, 0.02, (0, 0, 0.26), WOOD_DARK, verts=32, bevel=0.0, parent=root)
    for i in range(6):
        a = math.radians(i * 60 + 15)
        r = 0.09
        x, y = math.cos(a) * r, math.sin(a) * r
        cylinder(f"Stem{i}", 0.012, 0.28, (x * 1.4, y * 1.4, 0.38), LEAF_DARK, rot=(math.radians(28) * -math.sin(a), math.radians(28) * math.cos(a), 0), verts=8, bevel=0.0, parent=root)
        sphere(f"Leaf{i}", 0.11, (x * 2.4, y * 2.4, 0.56), LEAF if i % 2 else LEAF_DARK, scale=(1.0, 0.55, 0.9), parent=root)
    sphere("LeafTop", 0.1, (0, 0, 0.62), LEAF, scale=(1, 1, 0.8), parent=root)

elif WHICH == "bear":
    body = sphere("Body", 0.15, (0, 0, 0.16), FUR, scale=(1.0, 0.95, 1.1), parent=root)
    sphere("Belly", 0.09, (0, -0.09, 0.15), CREAM, scale=(1.0, 0.5, 1.0), parent=root)
    sphere("Head", 0.13, (0, -0.02, 0.36), FUR, parent=root)
    sphere("Muzzle", 0.06, (0, -0.11, 0.33), CREAM, scale=(1.2, 0.7, 0.8), parent=root)
    sphere("Nose", 0.02, (0, -0.16, 0.345), INK, parent=root)
    for s in (-1, 1):
        sphere(f"Ear{s}", 0.045, (0.09 * s, 0.0, 0.46), FUR, parent=root)
        sphere(f"EarIn{s}", 0.025, (0.09 * s, -0.025, 0.46), CREAM, parent=root)
        sphere(f"Eye{s}", 0.016, (0.045 * s, -0.115, 0.385), INK, parent=root)
        sphere(f"Arm{s}", 0.05, (0.16 * s, -0.03, 0.17), FUR, scale=(1.0, 1.0, 1.6), parent=root)
        sphere(f"Leg{s}", 0.06, (0.09 * s, -0.08, 0.06), FUR, scale=(1.0, 1.4, 0.9), parent=root)
        sphere(f"Paw{s}", 0.03, (0.09 * s, -0.16, 0.05), CREAM, scale=(1.0, 0.5, 1.0), parent=root)
    # 蝴蝶結
    sphere("BowL", 0.04, (-0.05, -0.1, 0.25), BOW, scale=(1.2, 0.6, 0.8), parent=root)
    sphere("BowR", 0.04, (0.05, -0.1, 0.25), BOW, scale=(1.2, 0.6, 0.8), parent=root)
    sphere("BowKnot", 0.022, (0, -0.115, 0.25), BOW, parent=root)

elif WHICH == "radio":
    box("Body", (0.32, 0.16, 0.22), (0, 0, 0.11), BODY, bevel=0.045, segments=4, parent=root)
    box("Grill", (0.15, 0.02, 0.13), (-0.06, -0.085, 0.11), GRILL, bevel=0.015, parent=root)
    for i in range(4):
        box(f"Bar{i}", (0.12, 0.012, 0.012), (-0.06, -0.095, 0.065 + i * 0.03), BODY, bevel=0.004, parent=root)
    box("Dial", (0.08, 0.02, 0.05), (0.09, -0.085, 0.16), GRILL, bevel=0.012, parent=root)
    for i, z in enumerate((0.075, 0.115)):
        cylinder(f"Knob{i}", 0.02, 0.025, (0.09 + (i - 0.5) * 0.045, -0.095, z - 0.03), KNOB, rot=(math.radians(90), 0, 0), verts=16, bevel=0.006, parent=root)
    cylinder("Antenna", 0.006, 0.26, (0.13, 0.03, 0.33), KNOB, rot=(0, math.radians(-25), 0), verts=8, bevel=0.0, parent=root)
    sphere("AntennaTip", 0.012, (0.185, 0.03, 0.45), GOLD, parent=root)
    box("Handle", (0.14, 0.02, 0.02), (0, 0, 0.245), KNOB, bevel=0.008, parent=root)

elif WHICH == "bookstack":
    for i, m in enumerate(BOOKS):
        box(f"Book{i}", (0.22 - i * 0.02, 0.16, 0.035), (i * 0.012, 0, 0.0175 + i * 0.035), m, bevel=0.01, parent=root)
        bpy.context.active_object.rotation_euler = (0, 0, (i - 1) * 0.15)

export_glb(OUT)
