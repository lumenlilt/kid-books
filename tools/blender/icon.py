# verify_by: 2027-03-12
# App 圖示：把 tools/blender/cat.py 那隻貓渲染成正方形 PNG（Eevee，純色背景）。
#   blender --background --python tools/blender/icon.py -- public/assets/models/cat.glb public/icons   # 第一個參數保留（未用）
import math
import sys
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
GLB = Path(argv[0]) if argv else Path("public/assets/models/cat.glb")
OUT = Path(argv[1]) if len(argv) > 1 else Path("public/icons")
OUT.mkdir(parents=True, exist_ok=True)

# 不走 GLB 匯入：Blender 重新匯入自己匯出的 GLB 後眼珠會變白（2026-09-12 實測，原因未查），
# 直接在同一個 session 跑 cat.py 建模（它會匯出到暫存路徑）再渲染。
import tempfile

cat_py = Path(__file__).resolve().parent / "cat.py"
_tmp = tempfile.NamedTemporaryFile(suffix=".glb", delete=False).name
_saved_argv = sys.argv
sys.argv = ["blender", "--", _tmp]
exec(compile(cat_py.read_text(encoding="utf-8"), str(cat_py), "exec"), {"__name__": "cat_build"})  # 獨立命名空間，別讓 cat.py 的 OUT 蓋掉這裡的
sys.argv = _saved_argv
bpy.ops.object.select_all(action="DESELECT")
scene = bpy.context.scene

# 深色眼珠在 Eevee 下會被面光整片反白：關掉 Ink 的鏡面反射、粗糙度拉滿
for m in bpy.data.materials:
    if m.name.startswith("Ink") and m.use_nodes:
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            for key in ("Specular IOR Level", "Specular"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0.0
            bsdf.inputs["Roughness"].default_value = 1.0

# 背景：色板 morning 的牆色偏暖
world = bpy.data.worlds.new("World")
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (0.9, 0.85, 0.8, 1.0)
bg.inputs[1].default_value = 0.35  # 世界光只當微弱環境光：太亮會整片反射在深色眼珠上變成白點（2026-09-12 實測）
scene.world = world

# 燈
bpy.ops.object.light_add(type="SUN", location=(3, 4, 6))
sun = bpy.context.active_object
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(-50), math.radians(10), math.radians(-35))
bpy.ops.object.light_add(type="AREA", location=(-3, 3, 3))
fill_obj = bpy.context.active_object
fill_obj.rotation_euler = (math.radians(-55), 0, math.radians(-40))
fill = fill_obj
fill.data.energy = 120
fill.data.size = 4

# 相機：貓的臉在 +Y（cat.py 的前方），所以相機要放 +Y 那側往 -Y 看；2026-09-12 第一版放 -Y 側，渲染出來是背影。
bpy.ops.object.camera_add(location=(0, 2.1, 0.85), rotation=(math.radians(80), 0, math.radians(180)))
cam = bpy.context.active_object
cam.data.lens = 70
scene.camera = cam

scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True  # 背景色由 PIL 合成，不讓它照亮模型
engine_names = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_names else ("BLENDER_EEVEE" if "BLENDER_EEVEE" in engine_names else engine_names[0])
try:
    scene.eevee.taa_render_samples = 32
except AttributeError:
    pass
scene.view_settings.view_transform = "Standard"

scene.render.filepath = str(OUT / "icon-1024.png")
bpy.ops.render.render(write_still=True)
print("rendered", scene.render.filepath, "engine", scene.render.engine)
