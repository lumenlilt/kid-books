# verify_by: 2027-03-12
# 書架上的貓：Blender bpy 程序化建模 → GLB。使用者 2026-09-12 裁示程式幾何版不夠可愛，改用 Blender 重做。
# 各部位物件名稱是 three.js 動畫的介面（src/scene/cat.ts 依名字找）：Cat / Body / Head / EyeL / EyeR /
# Mouth / Tail / Collar / Bell。模型可重生：改這支再跑一次即可。
#
#   blender --background --python tools/blender/cat.py -- public/assets/models/cat.glb
import math
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = argv[0] if argv else "cat.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name, rgb, rough=0.85):
    # rgb 用「螢幕上想看到的 sRGB 值」寫；Principled 的 Base Color 是線性空間，
    # 直接填 sRGB 數字匯出後會整隻變淡（2026-09-12 實測：橘貓變米色）。
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*[srgb_to_linear(c) for c in rgb], 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return m


FUR = material("Fur", (0.96, 0.62, 0.30))
FUR_DARK = material("FurDark", (0.82, 0.44, 0.18))
CREAM = material("Cream", (1.0, 0.95, 0.86))
INK = material("Ink", (0.13, 0.10, 0.09))
PINK = material("Pink", (1.0, 0.55, 0.62))
BLUSH = material("Blush", (1.0, 0.65, 0.68))
COLLAR = material("Collar", (0.95, 0.35, 0.30))
GOLD = material("Gold", (1.0, 0.82, 0.30), rough=0.5)


def set_parent(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def sphere(name, r, loc, scale=(1, 1, 1), mat=None, seg=22, rings=14, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=rings)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    if mat:
        o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return o


def cone(name, r, depth, loc, rot, mat, parent=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0.0, depth=depth, location=loc, rotation=rot, vertices=16)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return o


def torus(name, major, minor, loc, rot, mat, parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot, major_segments=28, minor_segments=10)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return o


# 根：一個 Empty，原點在腳底
bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.active_object
root.name = "Cat"

# 身體：胖胖的水滴，坐姿（Y 是前方，Z 向上；glTF 匯出時自動轉成 Y-up）
body = sphere("Body", 0.20, (0, 0, 0.19), scale=(1.0, 1.05, 0.95), mat=FUR, parent=root)
chest = sphere("Chest", 0.13, (0, 0.11, 0.17), scale=(1.0, 0.7, 1.05), mat=CREAM, parent=body)
for i, (y, s) in enumerate([(-0.02, 0.9), (-0.09, 0.8), (-0.15, 0.6)]):
    sphere(f"BackStripe{i}", 0.03, (0, y, 0.37), scale=(3.2 * s, 0.55, 0.45), mat=FUR_DARK, parent=body)

# 頭：比身體大一點（卡通比例）
head = sphere("Head", 0.235, (0, 0.05, 0.50), scale=(1.12, 1.0, 0.95), mat=FUR, parent=root)
sphere("Muzzle", 0.10, (0, 0.235, 0.455), scale=(1.35, 0.55, 0.75), mat=CREAM, parent=head)
for i, (x, s) in enumerate([(-0.07, 0.8), (0.0, 1.0), (0.07, 0.8)]):
    sphere(f"HeadStripe{i}", 0.022, (x, 0.02, 0.72), scale=(0.7, 3.4 * s, 0.6), mat=FUR_DARK, parent=head)
for side, name in [(-1, "L"), (1, "R")]:
    cone(f"Ear{name}", 0.085, 0.16, (0.15 * side, 0.02, 0.69), (math.radians(-12), math.radians(22 * side), 0), FUR, parent=head)
    cone(f"EarInner{name}", 0.045, 0.09, (0.145 * side, 0.045, 0.68), (math.radians(-12), math.radians(22 * side), 0), PINK, parent=head)
    # 眼睛要明顯突出頭的球面（頭在這個位置的表面約 y=0.27），不然只剩一線黑（2026-09-12 圖示渲染抓到）
    eye = sphere(f"Eye{name}", 0.05, (0.085 * side, 0.262, 0.515), scale=(1.0, 0.6, 1.15), mat=INK, seg=20, rings=12, parent=head)
    sphere(f"Shine{name}", 0.016, (0.085 * side + 0.016 * side, 0.29, 0.536), mat=CREAM, seg=12, rings=8, parent=eye)
    sphere(f"Blush{name}", 0.05, (0.15 * side, 0.20, 0.45), scale=(1.0, 0.35, 0.6), mat=BLUSH, seg=14, rings=8, parent=head)
sphere("Nose", 0.02, (0, 0.292, 0.47), scale=(1.3, 0.8, 0.8), mat=PINK, seg=12, rings=8, parent=head)
sphere("Mouth", 0.024, (0, 0.285, 0.43), scale=(1.5, 0.6, 0.35), mat=INK, seg=12, rings=8, parent=head)

# 腳：前腳併攏、後腳露一點
for side in (-1, 1):
    sphere(f"PawFront{1 if side > 0 else 0}", 0.065, (0.085 * side, 0.17, 0.06), scale=(1, 1.2, 0.9), mat=CREAM, parent=body)
    sphere(f"PawBack{1 if side > 0 else 0}", 0.075, (0.16 * side, 0.02, 0.07), scale=(1, 1.1, 0.9), mat=FUR, parent=body)

# 尾巴：貝茲曲線＋圓管，往上捲
bpy.ops.curve.primitive_bezier_curve_add(location=(0.08, -0.16, 0.12))
tail = bpy.context.active_object
tail.name = "Tail"
spline = tail.data.splines[0]
p0, p1 = spline.bezier_points[0], spline.bezier_points[1]
p0.co = (0, 0, 0)
p0.handle_left = (0, 0.05, -0.02)
p0.handle_right = (0.05, -0.16, 0.05)
p1.co = (0.14, -0.20, 0.34)
p1.handle_left = (0.16, -0.30, 0.16)
p1.handle_right = (0.10, -0.12, 0.42)
tail.data.bevel_depth = 0.035
tail.data.bevel_resolution = 5
tail.data.use_fill_caps = True
tail.data.materials.append(FUR)
bpy.ops.object.convert(target="MESH")
tail = bpy.context.active_object
tail.name = "Tail"
bpy.ops.object.shade_smooth()
set_parent(tail, root)
sphere("TailTip", 0.042, (0.10, -0.12, 0.43), mat=CREAM, parent=tail)

# 項圈與鈴鐺
torus("Collar", 0.165, 0.025, (0, 0.05, 0.31), (math.radians(78), 0, 0), COLLAR, parent=root)
sphere("Bell", 0.035, (0, 0.215, 0.27), mat=GOLD, seg=14, rings=10, parent=root)

# 匯出（三角化交給匯出器；Y-up）
bpy.ops.object.select_all(action="SELECT")
try:
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, use_selection=False,
        export_materials="EXPORT", export_normals=True, export_texcoords=False, export_animations=False,
        export_skins=False, export_cameras=False, export_lights=False,
    )
except TypeError as e:  # 版本間參數名不同時，退回最少參數
    print("export retry (minimal args):", e)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")
print("exported", OUT)
