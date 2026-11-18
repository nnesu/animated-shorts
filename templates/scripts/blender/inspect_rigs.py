# Headless rig inspection: blender -b -P scripts/blender/inspect_rigs.py -- <char.fbx> <library.glb>
# Prints, per armature: world matrix, facing, and for key bones the rest head/tail (armature space) and roll.
import bpy, sys, math
argv = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)

def arms_after(fn):
    before = set(bpy.data.objects)
    fn()
    return [o for o in bpy.data.objects if o not in before and o.type == "ARMATURE"]

tgt = arms_after(lambda: bpy.ops.import_scene.fbx(filepath=argv[0]))[0]
src = arms_after(lambda: bpy.ops.import_scene.gltf(filepath=argv[1]))[0]
KEY_T = ["Hips", "Abdomen", "Torso", "Neck", "Head", "ShoulderR", "UpperArmR", "LowerArmR", "FistR", "UpperLegR", "LowerLegR", "FootR", "UpperArmL"]
KEY_S = ["DEF-hips", "DEF-spine.001", "DEF-spine.002", "DEF-neck", "DEF-head", "DEF-shoulder.R", "DEF-upper_arm.R", "DEF-forearm.R", "DEF-hand.R",
         "DEF-thigh.R", "DEF-shin.R", "DEF-foot.R", "DEF-upper_arm.L"]
f = lambda v: "(" + ",".join(f"{x:+.2f}" for x in v) + ")"
for arm, keys in [(tgt, KEY_T), (src, KEY_S)]:
    print(f"== {arm.name} bones={len(arm.data.bones)} loc={f(arm.location)} rot={f(arm.rotation_euler)} scale={f(arm.scale)}")
    for k in keys:
        b = arm.data.bones.get(k)
        if not b:
            print(f"  {k}: MISSING"); continue
        d = (b.tail_local - b.head_local).normalized()
        z = b.matrix_local.to_3x3().col[2]
        print(f"  {k:18s} head={f(b.head_local)} dir={f(d)} zaxis={f(z)} len={b.length:.2f}")
print("== actions:", len(bpy.data.actions))
for a in list(bpy.data.actions)[:6]:
    print("  ", a.name, f"frames {a.frame_range[0]:.0f}-{a.frame_range[1]:.0f}")
print("target meshes:", [o.name for o in bpy.data.objects if o.type == "MESH" and o.parent == tgt or (o.type == "MESH" and any(m.object == tgt for m in o.modifiers if m.type == "ARMATURE"))][:5])
