# FBX folder -> one .glb per model (static props/foliage; no rig, no animation). Skips existing outputs.
# blender -b -P scripts/blender/fbx_to_glb.py -- <in_dir> <out_dir>
import bpy, os, sys
src, dst = sys.argv[sys.argv.index("--") + 1:][:2]
os.makedirs(dst, exist_ok=True)
n = 0
for f in sorted(os.listdir(src)):
    if not f.lower().endswith(".fbx"): continue
    out = os.path.join(dst, f[:-4] + ".glb")
    if os.path.exists(out): continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(src, f))
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=False, export_apply=True)
    n += 1
print("converted", n)
