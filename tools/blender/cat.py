# verify_by: 2027-03-13
# 書架上的貓 v3（D33）：使用者裁示 v2「看起來很奇怪」——大頭小身、凸眼球。v3 改成一整團絨毛玩偶的輪廓：
# 身體＋頭＋臉頰＋前腳用 metaball 融成一個平滑的「饅頭」，眼睛是貼在表面的小黑豆（不凸），耳朵小而圓，尾巴另一團 metaball 捲在旁邊。
# 動畫介面（src/scene/cat.ts 依名字找）：Body（呼吸）／EyeL、EyeR（眨眼）／Mouth（講話）／Tail（擺尾）／Collar（染色板）。Head 不存在＝不做歪頭。
#   blender --background --python tools/blender/cat.py -- public/assets/models/cat.glb
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _toy import material, set_parent, sphere, torus  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = argv[0] if argv else "cat.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

FUR = material("Fur", (0.98, 0.66, 0.34), 0.72)
CREAM = material("Cream", (1.0, 0.95, 0.86), 0.75)
INK = material("Ink", (0.14, 0.11, 0.1), 0.9)
PINK = material("Pink", (1.0, 0.55, 0.62), 0.6)
BLUSH = material("Blush", (1.0, 0.68, 0.7), 0.7)
COLLAR = material("Collar", (0.95, 0.35, 0.3), 0.55)
GOLD = material("Gold", (1.0, 0.82, 0.3), 0.45)

bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.active_object
root.name = "Cat"


def metaball_blob(name: str, elements, mat, resolution: float = 0.03, decimate: float = 0.5):
    """elements: [(x, y, z, radius, (sx, sy, sz))]. 全部融成一個 mesh。"""
    bpy.ops.object.metaball_add(type="BALL", location=(0, 0, 0))
    mb = bpy.context.active_object
    mb.name = name
    mb.data.resolution = resolution
    mb.data.render_resolution = resolution
    mb.data.elements.clear()
    for x, y, z, r, s in elements:
        e = mb.data.elements.new()
        e.type = "ELLIPSOID"
        e.co = (x, y, z)
        e.radius = r
        e.size_x, e.size_y, e.size_z = s
        e.stiffness = 2.0
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    o.name = name
    if decimate < 1:
        d = o.modifiers.new("Decimate", "DECIMATE")
        d.ratio = decimate
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


# 一整團：身體（矮胖）、頭（比身體略小、坐在前上方，融在一起）、兩頰、前腳兩球、後臀、兩隻耳朵
body = metaball_blob("Body", [
    (0, 0.0, 0.2, 0.32, (1.05, 0.9, 0.78)),      # 身體
    (0, -0.04, 0.42, 0.29, (1.08, 0.92, 0.9)),   # 頭（融進身體，沒有脖子）
    (-0.13, -0.16, 0.36, 0.11, (1.0, 0.8, 0.8)),  # 左頰
    (0.13, -0.16, 0.36, 0.11, (1.0, 0.8, 0.8)),   # 右頰
    (-0.1, -0.2, 0.07, 0.1, (1.0, 1.1, 0.8)),     # 左前腳
    (0.1, -0.2, 0.07, 0.1, (1.0, 1.1, 0.8)),      # 右前腳
    (-0.2, 0.02, 0.1, 0.1, (1.0, 1.0, 0.8)),      # 左臀
    (0.2, 0.02, 0.1, 0.1, (1.0, 1.0, 0.8)),       # 右臀
    (-0.165, -0.01, 0.63, 0.1, (0.62, 0.45, 1.55)),  # 左耳（尖、融進頭頂）
    (0.165, -0.01, 0.63, 0.1, (0.62, 0.45, 1.55)),   # 右耳
], FUR, resolution=0.028, decimate=0.45)
set_parent(body, root)


def front_y(x: float, z: float, tol: float = 0.035) -> float:
    """身體 mesh 在 (x, z) 附近最前面的 y（前方是 -Y）。臉上的東西全部貼著這個表面放，不再用猜的。"""
    best = 0.0
    for v in body.data.vertices:
        if abs(v.co.x - x) < tol and abs(v.co.z - z) < tol and v.co.y < best:
            best = v.co.y
    return best


def top_z(x: float = 0.0, tol: float = 0.05) -> float:
    return max(v.co.z for v in body.data.vertices if abs(v.co.x - x) < tol)


TOP = top_z(0.0)
EAR_TOP = top_z(0.165, 0.04)
print("cat: head top", round(TOP, 3), "ear top", round(EAR_TOP, 3))

# 內耳：貼在耳朵前表面
for s, name in ((-1, "L"), (1, "R")):
    ez = EAR_TOP - 0.06
    inner = sphere(f"EarInner{name}", 0.038, (0.165 * s, front_y(0.165 * s, ez) - 0.003, ez), PINK, scale=(0.5, 0.3, 1.0), parent=root)

# 臉：全部貼表面。眼睛只露一個小圓弧（不凸），嘴鼻在口鼻部上
EYE_Z = 0.45
MUZ_Z = 0.36
fy_m = front_y(0.0, MUZ_Z)
sphere("Muzzle", 0.11, (0, fy_m + 0.02, MUZ_Z), CREAM, scale=(1.35, 0.5, 0.7), parent=root)
for s, name in ((-1, "L"), (1, "R")):
    fy = front_y(0.1 * s, EYE_Z)
    sphere(f"Eye{name}", 0.034, (0.1 * s, fy + 0.008, EYE_Z), INK, scale=(1.0, 0.5, 1.1), parent=root)
    sphere(f"Shine{name}", 0.011, (0.1 * s + 0.011 * s, fy - 0.012, EYE_Z + 0.012), CREAM, parent=root)
    fb = front_y(0.2 * s, 0.38)
    sphere(f"Blush{name}", 0.045, (0.2 * s, fb + 0.004, 0.38), BLUSH, scale=(1.0, 0.3, 0.6), parent=root)
sphere("Nose", 0.017, (0, fy_m - 0.045, MUZ_Z + 0.035), PINK, scale=(1.3, 0.7, 0.8), parent=root)
# 嘴：一小段微笑（貝茲＋圓管），貼在口鼻部前面
bpy.ops.curve.primitive_bezier_curve_add(location=(0, fy_m - 0.05, MUZ_Z + 0.0))
mouth = bpy.context.active_object
msp = mouth.data.splines[0]
m0, m1 = msp.bezier_points[0], msp.bezier_points[1]
m0.co, m0.handle_left, m0.handle_right = (-0.03, 0, 0.008), (-0.042, 0, 0.014), (-0.011, 0, -0.006)
m1.co, m1.handle_left, m1.handle_right = (0.03, 0, 0.008), (0.011, 0, -0.006), (0.042, 0, 0.014)
mouth.data.bevel_depth = 0.005
mouth.data.bevel_resolution = 4
mouth.data.use_fill_caps = True
mouth.data.materials.append(INK)
bpy.ops.object.convert(target="MESH")
mouth = bpy.context.active_object
mouth.name = "Mouth"
bpy.ops.object.shade_smooth()
set_parent(mouth, root)

# 尾巴：另一團 metaball，捲在右側
tail = metaball_blob("Tail", [
    (0.2, 0.16, 0.07, 0.075, (1, 1, 1)),
    (0.3, 0.14, 0.1, 0.07, (1, 1, 1)),
    (0.36, 0.08, 0.16, 0.065, (1, 1, 1)),
    (0.36, 0.0, 0.23, 0.06, (1, 1, 1)),
    (0.31, -0.05, 0.27, 0.055, (1, 1, 1)),
], FUR, resolution=0.025, decimate=0.5)
tail.location = (0, 0, 0)
set_parent(tail, root)
sphere("TailTip", 0.045, (0.29, -0.07, 0.28), CREAM, parent=root)

# 項圈與鈴鐺
torus("Collar", 0.2, 0.024, (0, -0.06, 0.24), COLLAR, rot=(math.radians(82), 0, 0), parent=root)
sphere("Bell", 0.032, (0, -0.28, 0.2), GOLD, parent=root)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, use_selection=False,
    export_materials="EXPORT", export_normals=True, export_texcoords=False, export_animations=False,
    export_skins=False, export_cameras=False, export_lights=False,
)
print("exported", OUT)
