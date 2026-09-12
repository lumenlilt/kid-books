# 共用：玩具風建模小工具（bpy）。所有幾何都走這裡的 bevel＋smooth-by-angle，輪廓才會一致地圓。
import math
import bpy


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name: str, rgb, rough: float = 0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*[srgb_to_linear(c) for c in rgb], 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return m


def set_parent(child, parent):
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def finish(obj, bevel: float = 0.02, segments: int = 3, smooth_angle: float = 40.0):
    """bevel 修飾器＋依角度平滑：玩具的圓邊。"""
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(50)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth_angle))
    except Exception:  # noqa: BLE001
        bpy.ops.object.shade_smooth()
    obj.select_set(False)
    return obj


def box(name: str, size, loc, mat, bevel: float = 0.02, segments: int = 3, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    finish(o, bevel, segments)
    if parent:
        set_parent(o, parent)
    return o


def cylinder(name: str, r: float, depth: float, loc, mat, rot=(0, 0, 0), verts: int = 24, bevel: float = 0.01, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    finish(o, bevel, 2)
    if parent:
        set_parent(o, parent)
    return o


def cone(name: str, r1: float, r2: float, depth: float, loc, mat, rot=(0, 0, 0), verts: int = 28, bevel: float = 0.01, parent=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    finish(o, bevel, 2)
    if parent:
        set_parent(o, parent)
    return o


def torus(name: str, major: float, minor: float, loc, mat, rot=(0, 0, 0), parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot, major_segments=32, minor_segments=12)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return o


def sphere(name: str, r: float, loc, mat, scale=(1, 1, 1), parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=16)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if parent:
        set_parent(o, parent)
    return o


def arch_board(name: str, width: float, thickness: float, height: float, rise: float, loc, mat, parent=None, segments: int = 48):
    """弧頂板：一片沿 X 的網格，Z 依 cos 抬起（中間高 rise），solidify 出厚度。前方是 -Y。"""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=segments, y_subdivisions=1, size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (width, thickness, 1)
    bpy.ops.object.transform_apply(scale=True)
    me = o.data
    for v in me.vertices:
        t = v.co.x / (width / 2)  # -1..1
        v.co.z += rise * max(0.0, math.cos(t * math.pi / 2)) ** 1.6  # += 不是 =：transform_apply 會把位置烤進頂點，用 = 會把整片拉回原點（2026-09-13 實測）；cos 要 clamp，±1 處會是 -1e-16
    sol = o.modifiers.new("Solidify", "SOLIDIFY")
    sol.thickness = height
    sol.offset = 0
    o.data.materials.append(mat)
    finish(o, 0.015, 3)
    if parent:
        set_parent(o, parent)
    return o


def export_glb(path: str):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_apply=True, export_yup=True, use_selection=False,
        export_materials="EXPORT", export_normals=True, export_texcoords=True, export_animations=False,
        export_skins=False, export_cameras=False, export_lights=False,
    )
    print("exported", path)
