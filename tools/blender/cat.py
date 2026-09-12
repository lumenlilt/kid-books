# verify_by: 2027-03-13
# 書架上的貓 v5（D34）：照使用者 2026-09-13 給的概念圖（art/reference/cat-concept.jpg，三視圖）建模——
# 乳白三花絨毛玩偶：左耳＋左額一塊淺棕、右耳＋右額一塊灰棕、左側身淺棕、右臀灰棕、尾巴兩道灰環、
# 直立橢圓點狀眼帶高光、粉紅小三角鼻、ω 嘴、腮紅、三根鬍鬚、前掌朝前露粉紅肉球，沒有項圈。
#
# 做法（v4 的 metaball＋頂點色被使用者退回：表面坑疤、花色糊）：
#   · 每個部位是獨立的乾淨基本體（超橢球頭、球身、香腸腿、球掌），像玩偶縫合的零件，接縫就是設計的一部分。
#   · 花色是「貼片」：在切平面上生成有機外形的圓盤網格，逐點用 closest_point_on_mesh 投影到目標表面外 2 mm，
#     邊緣乾淨、材質獨立（PatchTan／PatchGrey），three.js 不需要頂點色。
#   · 尾巴是取樣後的折線管，分成 5 段 spline 交替材質，就是灰環。
# 動畫介面（cat.ts 依名字找）：Body（呼吸，原點在地面中心）／Head（擺頭，原點在脖子）／EyeL、EyeR（眨眼）／Mouth（講話）／Tail（擺尾，原點在尾根）。
#   blender --background --python tools/blender/cat.py -- public/assets/models/cat.glb
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _toy import export_glb, material, set_parent  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = argv[0] if argv else "cat.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)

# 概念圖取色（sRGB）
CREAM = (0.96, 0.93, 0.86)
TAN = (0.80, 0.66, 0.51)
GREY = (0.62, 0.57, 0.53)
PINK_PAD = (0.93, 0.62, 0.62)
PINK_EAR = (0.94, 0.69, 0.69)
BLUSH_C = (0.96, 0.70, 0.70)
INK_C = (0.16, 0.14, 0.13)

BODY_MAT = material("Body", CREAM, 0.72)
PATCH_TAN = material("PatchTan", TAN, 0.72)
PATCH_GREY = material("PatchGrey", GREY, 0.72)
EAR_PINK = material("EarPink", PINK_EAR, 0.7)
INK = material("Ink", INK_C, 0.9)
NOSE = material("Nose", PINK_PAD, 0.6)
BLUSH = material("Blush", BLUSH_C, 0.75)
PAD = material("Pad", PINK_PAD, 0.65)
SHINE = material("Shine", (1.0, 1.0, 1.0), 0.4)

FRONT = Vector((0, -1, 0))  # 臉朝 Blender -Y（glTF +Z）


def empty(name: str, loc, parent=None):
    bpy.ops.object.empty_add(location=loc)
    e = bpy.context.active_object
    e.name = name
    if parent:
        set_parent(e, parent)
    return e


root = empty("Cat", (0, 0, 0))
body_grp = empty("Body", (0, 0, 0), root)          # 呼吸：以地面中心為軸放大
NECK = Vector((0, -0.02, 0.40))
head_grp = empty("Head", NECK, root)               # 擺頭：以脖子為軸


class Part:
    """一個圓潤零件：中心、半徑、縮放、超橢球指數、隆起。形狀函式與網格頂點是同一個公式，
    所以貼片可以直接用公式算表面點與法線（平滑），不必去問網格（網格的三角面會刻進貼片，2026-09-13 v5 第一次渲染就是這樣皺的）。"""

    def __init__(self, obj, center, r, scale, squareness, bumps):
        self.obj, self.center, self.r = obj, Vector(center), r
        self.scale, self.n, self.bumps = Vector(scale), 2.0 + squareness, [(Vector(c).normalized(), sg, a) for c, sg, a in bumps]

    def rr(self, d: Vector) -> float:
        k = (abs(d.x) ** self.n + abs(d.y) ** self.n + abs(d.z) ** self.n) ** (1.0 / self.n)
        rr = 1.0 / k
        for c, sigma, amp in self.bumps:  # 沿徑向的高斯隆起
            ang = math.acos(max(-1.0, min(1.0, d.dot(c))))
            rr += amp * math.exp(-(ang * ang) / (2 * sigma * sigma))
        return rr

    def point(self, D: Vector) -> Vector:
        """從中心朝世界方向 D 的表面點。"""
        d = Vector((D.x / self.scale.x, D.y / self.scale.y, D.z / self.scale.z)).normalized()
        p = d * (self.rr(d) * self.r)
        return self.center + Vector((p.x * self.scale.x, p.y * self.scale.y, p.z * self.scale.z))

    def surface(self, D):
        """表面點與外法線（有限差分）。"""
        D = Vector(D).normalized()
        up = Vector((0, 0, 1)) if abs(D.z) < 0.9 else Vector((0, -1, 0))
        u = up.cross(D).normalized()
        v = D.cross(u).normalized()
        e = 1e-3
        p0 = self.point(D)
        n = (self.point((D + u * e).normalized()) - p0).cross(self.point((D + v * e).normalized()) - p0).normalized()
        if n.dot(D) < 0:
            n = -n
        return p0, n


def blob(name: str, r: float, loc, mat, scale=(1, 1, 1), parent=None, segments: int = 32, rings: int = 20, squareness: float = 0.0, bumps=()) -> Part:
    """圓潤零件：UV 球 → 可選的超橢球化（squareness>0 略方，像塞飽的布偶）→ 可選的隆起（臉頰）→ 套用縮放。"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=loc, segments=segments, ring_count=rings)
    o = bpy.context.active_object
    o.name = name
    part = Part(o, loc, r, scale, squareness, bumps)
    me = o.data
    for v in me.vertices:
        d = v.co.normalized()
        v.co = d * (part.rr(d) * r)
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    me.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return part


def patch(name: str, target: Part, center_dir, radius_ang: float, mat, lobes=(), rings: int = 10, spokes: int = 36, offset: float = 0.0025, parent=None):
    """貼在 target 表面的有機圓盤：以零件中心為球心、center_dir 為中心方向，
    切平面上取 (rho, theta) → 方向 → 解析表面點外抬 offset。外形 r(θ)=radius_ang·(1+Σ a·cos(k·θ+φ))。"""
    d = Vector(center_dir).normalized()
    up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((0, -1, 0))
    u = up.cross(d).normalized()
    v = d.cross(u).normalized()
    dirs, faces = [d], []
    for i in range(1, rings + 1):
        for j in range(spokes):
            th = 2 * math.pi * j / spokes
            shape = 1.0
            for a, k, ph in lobes:
                shape += a * math.cos(k * th + ph)
            rho = radius_ang * (i / rings) * shape
            dirs.append(d * math.cos(rho) + (u * math.cos(th) + v * math.sin(th)) * math.sin(rho))
    for j in range(spokes):
        faces.append((0, 1 + j, 1 + (j + 1) % spokes))
    for i in range(1, rings):
        a0 = 1 + (i - 1) * spokes
        b0 = 1 + i * spokes
        for j in range(spokes):
            j1 = (j + 1) % spokes
            faces.append((a0 + j, b0 + j, b0 + j1, a0 + j1))
    out = []
    for D in dirs:
        loc, nrm = target.surface(D)
        out.append(tuple(loc + nrm * offset))
    me = bpy.data.meshes.new(name)
    me.from_pydata(out, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    me.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.shade_smooth()
    o.select_set(False)
    if parent:
        set_parent(o, parent)
    return o


def stick_on(name: str, target: Part, at_dir, r: float, mat, scale=(1, 0.5, 1), sink: float = 0.004, parent=None):
    """貼表面的小零件（眼、腮紅、肉球）：從零件中心朝 at_dir 找表面點，把壓扁的球擺上去，薄的那個軸對齊法線。"""
    loc, nrm = target.surface(Vector(at_dir))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc - nrm * sink, segments=16, ring_count=12)  # 小零件省面
    o = bpy.context.active_object
    o.name = name
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = nrm.to_track_quat("-Y", "Z")
    o.scale = scale
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return o, loc, nrm


# ---- 頭：超橢球（略方、略寬），下側兩邊臉頰微微鼓起；原點在頭心
HEAD_C = Vector((0, -0.02, 0.63))
head = blob("HeadMesh", 0.31, HEAD_C, BODY_MAT, scale=(1.10, 0.96, 0.92), parent=head_grp, segments=44, rings=30, squareness=0.5,
            bumps=(((-0.75, -0.55, -0.45), 0.42, 0.07), ((0.75, -0.55, -0.45), 0.42, 0.07)))

# ---- 身體：圓身＋兩坨後臀＋兩根直立前腿＋前掌＋後腳；原點都在零件中心，父層 Body 在地面
torso = blob("Torso", 0.29, (0, 0.05, 0.31), BODY_MAT, scale=(0.86, 1.05, 0.85), parent=body_grp, segments=36, rings=24, squareness=0.3,
             bumps=(((0, -0.9, 0.25), 0.6, 0.08),))
haunches, paws = {}, {}
for s, name in ((-1, "L"), (1, "R")):
    haunches[name] = blob(f"Haunch{name}", 0.15, (0.175 * s, 0.09, 0.15), BODY_MAT, scale=(1.0, 1.15, 0.95), parent=body_grp, segments=28, rings=18)
    blob(f"Leg{name}", 0.074, (0.09 * s, -0.17, 0.17), BODY_MAT, scale=(1.0, 1.0, 2.1), parent=body_grp, segments=24, rings=16)
    paws[name] = blob(f"Paw{name}", 0.082, (0.095 * s, -0.20, 0.078), BODY_MAT, scale=(1.0, 0.95, 0.85), parent=body_grp, segments=24, rings=16)
    blob(f"Foot{name}", 0.075, (0.2 * s, 0.14, 0.065), BODY_MAT, scale=(1.0, 1.25, 0.8), parent=body_grp, segments=20, rings=14)

# ---- 耳朵：寬底圓尖三角，稍微外傾，底部埋進頭裡；內耳粉紅同形較小、往前提
TOP = HEAD_C.z + 0.31 * 0.92
for s, name, mat in ((-1, "L", PATCH_TAN), (1, "R", PATCH_GREY)):
    ex, ez = 0.20 * s, TOP - 0.03
    rot = (math.radians(-10), math.radians(26 * s), 0)
    bpy.ops.mesh.primitive_cone_add(radius1=0.15, radius2=0.025, depth=0.27, location=(ex, 0.0, ez + 0.065), rotation=rot, vertices=24)
    ear = bpy.context.active_object
    ear.name = f"Ear{name}"
    ear.scale = (1.0, 0.6, 1.0)
    ear.data.materials.append(mat)
    sub = ear.modifiers.new("Smooth", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    bpy.ops.object.shade_smooth()
    set_parent(ear, head_grp)
    bpy.ops.mesh.primitive_cone_add(radius1=0.085, radius2=0.012, depth=0.165, location=(ex + 0.006 * s, -0.05, ez + 0.09), rotation=rot, vertices=20)
    inner = bpy.context.active_object
    inner.name = f"EarInner{name}"
    inner.scale = (1.0, 0.28, 1.0)
    inner.data.materials.append(EAR_PINK)
    sub2 = inner.modifiers.new("Smooth", "SUBSURF")
    sub2.levels = 2
    bpy.ops.object.shade_smooth()
    set_parent(inner, head_grp)

# ---- 花色貼片（投影到頭與臀的表面）
# 左額：從左耳根蓋到左眼上方、往中線鼓一塊（概念圖正面：觀眾左邊那塊比較大）
patch("PatchHeadL", head, (-0.60, 0.0, 0.72), 0.70, PATCH_TAN, lobes=((0.20, 1, 0.3), (0.10, 2, 1.2)), parent=head_grp)
# 右額：從右耳根往下到右眼外側，稍小
patch("PatchHeadR", head, (0.62, 0.05, 0.70), 0.60, PATCH_GREY, lobes=((0.18, 1, -0.6), (0.08, 2, 0.4)), parent=head_grp)
# 左側身淺棕、右臀灰棕
patch("PatchBodyL", haunches["L"], (-0.9, -0.15, 0.3), 0.75, PATCH_TAN, lobes=((0.15, 1, 0.8), (0.1, 2, 0.0)), parent=body_grp)
patch("PatchBodyR", haunches["R"], (0.75, 0.55, 0.25), 0.7, PATCH_GREY, lobes=((0.15, 1, -0.4), (0.1, 3, 0.5)), parent=body_grp)

# ---- 臉：眼睛是直立橢圓，臉頰腮紅、粉紅三角鼻、ω 嘴、每邊三根鬍鬚
EYE_DIR_Z = -0.18  # 眼睛略低於頭心
for s, name in ((-1, "L"), (1, "R")):
    _, eloc, enrm = stick_on(f"Eye{name}", head, (0.40 * s, -1.0, EYE_DIR_Z), 0.048, INK, scale=(0.8, 0.42, 1.0), sink=0.014, parent=head_grp)
    # 高光：眼睛左上角
    side = enrm.cross(Vector((0, 0, 1))).normalized()  # 朝觀眾的左（-X）
    sp = eloc + enrm * 0.008 + side * 0.014 + Vector((0, 0, 0.018))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=sp, segments=12, ring_count=8)
    sh = bpy.context.active_object
    sh.name = f"Shine{name}"
    sh.data.materials.append(SHINE)
    bpy.ops.object.shade_smooth()
    set_parent(sh, head_grp)
    stick_on(f"Blush{name}", head, (0.78 * s, -1.0, -0.38), 0.048, BLUSH, scale=(1.0, 0.22, 0.62), sink=0.006, parent=head_grp)
    # 鬍鬚：從臉頰外側往外扇開
    wloc, wnrm = head.surface(Vector((0.95 * s, -0.75, -0.35)))
    for i, (dz, tilt) in enumerate(((0.022, 9), (0.0, 0), (-0.022, -9))):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.0032, depth=0.115, location=(wloc.x + 0.035 * s, wloc.y - 0.005, wloc.z + dz), rotation=(0, math.radians(90 - tilt * s), math.radians(-8 * s)), vertices=6)
        w = bpy.context.active_object
        w.name = f"Whisker{name}{i}"
        w.data.materials.append(INK)
        set_parent(w, head_grp)

# 鼻：小小的圓角三角形（尖端朝下），貼在眼睛連線正下方
nloc, nnrm = head.surface(Vector((0, -1.0, -0.30)))
bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.027, radius2=0.0, depth=0.014, location=nloc + nnrm * 0.002)
nose = bpy.context.active_object
nose.name = "Nose"
base_v = next(v.co for v in nose.data.vertices if v.co.z < 0)
spin = math.radians(-90) - math.atan2(base_v.y, base_v.x)  # 讓一個尖角指向 local -Y（＝世界的下方）
nose.rotation_mode = "QUATERNION"
nose.rotation_quaternion = nnrm.to_track_quat("Z", "Y") @ Quaternion((0, 0, 1), spin)
nose.data.materials.append(NOSE)
bv = nose.modifiers.new("Bevel", "BEVEL")
bv.width = 0.006
bv.segments = 4
ns = nose.modifiers.new("Smooth", "SUBSURF")
ns.levels = 2
bpy.ops.object.shade_smooth()
set_parent(nose, head_grp)

# ω 嘴：三點貝茲，兩個小弧，在鼻子下方；原點在嘴中心（cat.ts 講話時以它為軸上下縮放）
mloc, mnrm = head.surface(Vector((0, -1.0, -0.40)))
bpy.ops.curve.primitive_bezier_curve_add(location=mloc + mnrm * 0.001)
mouth = bpy.context.active_object
spl = mouth.data.splines[0]
spl.bezier_points.add(2)
p0, p1, p2, p3 = spl.bezier_points
for bp in spl.bezier_points:
    bp.handle_left_type = bp.handle_right_type = "FREE"
p0.co, p0.handle_left, p0.handle_right = (-0.041, 0, 0.014), (-0.053, 0, 0.025), (-0.03, 0, 0.002)
p1.co, p1.handle_left, p1.handle_right = (-0.018, 0, -0.005), (-0.025, 0, -0.005), (-0.009, 0, -0.005)
p2.co, p2.handle_left, p2.handle_right = (0.018, 0, -0.005), (0.009, 0, -0.005), (0.025, 0, -0.005)
p3.co, p3.handle_left, p3.handle_right = (0.041, 0, 0.014), (0.03, 0, 0.002), (0.053, 0, 0.025)
# 中間兩點之間往上凸一點成 ω：把 p1/p2 的內側把手抬高
p1.handle_right = (-0.007, 0, 0.005)
p2.handle_left = (0.007, 0, 0.005)
mouth.data.bevel_depth = 0.0042
mouth.data.bevel_resolution = 4
mouth.data.use_fill_caps = True
mouth.data.resolution_u = 16
mouth.data.materials.append(INK)
bpy.ops.object.convert(target="MESH")
mouth = bpy.context.active_object
mouth.name = "Mouth"
mouth.rotation_mode = "QUATERNION"
mouth.rotation_quaternion = mnrm.to_track_quat("-Y", "Z")
bpy.ops.object.shade_smooth()
set_parent(mouth, head_grp)

# ---- 肉球：前掌正面朝觀眾，一個大墊＋三顆豆（概念圖正面）
for s, name in ((-1, "L"), (1, "R")):
    paw = paws[name]
    stick_on(f"Pad{name}", paw, (0, -0.85, -0.35), 0.03, PAD, scale=(1.15, 0.35, 0.9), sink=0.004, parent=body_grp)
    for j, (dx, dz) in enumerate(((-0.55, 0.28), (0.0, 0.42), (0.55, 0.28))):
        stick_on(f"Toe{name}{j}", paw, (dx, -0.85, dz), 0.0115, PAD, scale=(1.0, 0.4, 1.0), sink=0.002, parent=body_grp)

# ---- 尾巴：從右臀後方出來、往後下再往上捲到背中間（概念圖側面／背面）；原點在尾根，分段交替材質＝灰環
TAIL_BASE = Vector((0.12, 0.24, 0.16))
def tail_curve(t: float) -> Vector:
    """相對尾根：先往後外側、再往上往前捲，t∈[0,1]。三次貝茲。"""
    P0 = Vector((0, 0, 0))
    P1 = Vector((0.10, 0.18, -0.07))
    P2 = Vector((0.19, 0.14, 0.30))
    P3 = Vector((0.04, 0.0, 0.35))
    mt = 1 - t
    return P0 * mt ** 3 + P1 * 3 * mt * mt * t + P2 * 3 * mt * t * t + P3 * t ** 3

bpy.ops.curve.primitive_bezier_curve_add(location=TAIL_BASE)
tail = bpy.context.active_object
tail.name = "Tail"
cd = tail.data
cd.splines.clear()
bands = [(0.0, 0.18, 0), (0.18, 0.36, 1), (0.36, 0.62, 0), (0.62, 0.80, 1), (0.80, 1.0, 0)]  # (t0, t1, 材質 0=乳白 1=灰)
cd.materials.append(BODY_MAT)
cd.materials.append(PATCH_GREY)
for t0, t1, mi in bands:
    sp = cd.splines.new("POLY")
    n = 14
    sp.points.add(n - 1)
    for i in range(n):
        p = tail_curve(t0 + (t1 - t0) * i / (n - 1))
        sp.points[i].co = (p.x, p.y, p.z, 1.0)
    sp.material_index = mi
    sp.use_smooth = True
cd.bevel_depth = 0.062
cd.bevel_resolution = 5
cd.use_fill_caps = True
bpy.ops.object.convert(target="MESH")
tail = bpy.context.active_object
tail.name = "Tail"
bpy.ops.object.shade_smooth()
set_parent(tail, root)
# 尾尖圓頭
tip = TAIL_BASE + tail_curve(1.0)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=tip, segments=16, ring_count=12)
tt = bpy.context.active_object
tt.name = "TailTip"
tt.data.materials.append(BODY_MAT)
bpy.ops.object.shade_smooth()
set_parent(tt, tail)

bpy.context.view_layer.update()
zs = [(o.matrix_world @ Vector(c)).z for o in bpy.data.objects if o.type == "MESH" for c in o.bound_box]
print("cat v5: height", round(max(zs) - min(zs), 3), "meshes", sum(1 for o in bpy.data.objects if o.type == "MESH"))
export_glb(OUT)
