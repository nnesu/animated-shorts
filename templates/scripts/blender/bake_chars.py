# Bake Universal Animation Library clips onto a Quaternius 2019 character (Ultimate Animated Character Pack) and export
# one GLB with the character, its rig and the baked clips. Run headless:
#   blender -b -P scripts/blender/bake_chars.py -- <char.fbx> <out.glb> <clip1,clip2,...> <lib1.glb> [lib2.glb ...] [--preview <dir>]
# Both rigs rest in the same T-pose, facing -Y with the right side at -X, but roll their bones differently. Per bone and
# frame (armature space = world here, both armatures sit at the origin unrotated):
#   target = source_pose @ source_rest^-1 @ target_rest      (rotation; the hips also take the source's height, scaled)
# which carries the roll difference exactly. Bones are set parents first, with a depsgraph update after each.
import bpy, sys, os
from mathutils import Matrix

a = sys.argv[sys.argv.index("--") + 1:]
preview = None
if "--preview" in a:
    i = a.index("--preview"); preview = os.path.abspath(a[i + 1]); a = a[:i] + a[i + 2:]
char, out, clips, libs = a[0], a[1], a[2].split(","), a[3:]

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = 30

def imported(fn):
    before = set(bpy.data.objects)
    fn()
    return [o for o in bpy.data.objects if o not in before]

new = imported(lambda: bpy.ops.import_scene.fbx(filepath=char))
tgt = next(o for o in new if o.type == "ARMATURE")
tgt_meshes = [o for o in new if o.type == "MESH"]
for act in list(bpy.data.actions): bpy.data.actions.remove(act)   # the character's own clips are not exported

# ---- house-style face (rest pose, world space; the character faces -Y, up is +Z) ----
# The model's slit eyes ("Face" material) and its brows (non-skin faces in the band above the eyes) are deleted. Skin faces
# that look forward get a front-projected UV ("FaceUV"); every other face maps to one corner pixel. The engine draws the
# expression (eyes, brows, mouth) into the skin's texture at those UVs, so the face is part of the skin: same light, no gap.
# Eye UVs and the eye span (in UV units) go to the mesh's extras as faceUV = [uL, vL, uR, vR, span].
import bmesh
from mathutils import Vector
body = max(tgt_meshes, key=lambda o: len(o.data.vertices))
names = [m.name.split(".")[0] if m else "" for m in body.data.materials]
if "Face" in names and "Skin" in names:
    iface, iskin, mw = names.index("Face"), names.index("Skin"), body.matrix_world
    for l in list(body.data.uv_layers): body.data.uv_layers.remove(l)
    bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.index_update()
    eye = [mw @ v.co for f in bm.faces if f.material_index == iface for v in f.verts]
    c = sum(eye, Vector()) / len(eye)
    L, R = [p for p in eye if p.x >= c.x], [p for p in eye if p.x < c.x]
    eL, eR = sum(L, Vector()) / len(L), sum(R, Vector()) / len(R)
    s = (eL - eR).length
    def band(p):
        d = p - c
        return 0.12 * s < d.z < 0.8 * s and abs(d.x) < 0.95 * s and d.y < 0.25 * s
    # brows = whole separate pieces (islands) of non-skin geometry lying entirely in the band; bangs and helmet brims are
    # joined to the rest of the hair / hat, so they are never cut (they keep covering the painted face behind them)
    gone, seen = [f for f in bm.faces if f.material_index == iface], set()
    for f0 in bm.faces:
        if f0.index in seen or f0.material_index in (iface, iskin): continue
        isl, stack = [], [f0]; seen.add(f0.index)
        while stack:
            f = stack.pop(); isl.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen and g.material_index not in (iface, iskin): seen.add(g.index); stack.append(g)
        if all(band(mw @ v.co) for f in isl for v in f.verts): gone += isl
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    uv = bm.loops.layers.uv.new("FaceUV")
    W, cx, cz, n3 = 4.0 * s, c.x, c.z - 0.3 * s, mw.to_3x3()
    UV = lambda p: ((p.x - cx) / W + 0.5, (p.z - cz) / W + 0.5)
    for f in bm.faces:
        front = f.material_index == iskin and (n3 @ f.normal).normalized().y < -0.15
        for lp in f.loops: lp[uv].uv = UV(mw @ lp.vert.co) if front else (0.01, 0.01)
    bm.to_mesh(body.data); bm.free()
    (uL, vL), (uR, vR) = UV(eL), UV(eR)
    body["faceUV"] = [uL, vL, uR, vR, s / W]
    print("FACE", [round(x, 3) for x in body["faceUV"]], "deleted", len(gone))

# target bone -> library bone (parents first). Library 1 uses Rigify DEF- names, library 2 Unreal-style names.
def make_map(rig):
    if "DEF-hips" in rig.data.bones:
        m = [("Hips", "DEF-hips"), ("Abdomen", "DEF-spine.001"), ("Torso", "DEF-spine.002"), ("Neck", "DEF-neck"), ("Head", "DEF-head")]
        for s in ("R", "L"):
            m += [(f"Shoulder.{s}", f"DEF-shoulder.{s}"), (f"UpperArm.{s}", f"DEF-upper_arm.{s}"), (f"LowerArm.{s}", f"DEF-forearm.{s}"),
                  (f"Fist.{s}", f"DEF-hand.{s}"), (f"UpperLeg.{s}", f"DEF-thigh.{s}"), (f"LowerLeg.{s}", f"DEF-shin.{s}"), (f"Foot.{s}", f"DEF-foot.{s}")]
        return m, "DEF-hips"
    m = [("Hips", "pelvis"), ("Abdomen", "spine_01"), ("Torso", "spine_02"), ("Neck", "neck_01"), ("Head", "Head")]
    for s, u in (("R", "r"), ("L", "l")):
        m += [(f"Shoulder.{s}", f"clavicle_{u}"), (f"UpperArm.{s}", f"upperarm_{u}"), (f"LowerArm.{s}", f"lowerarm_{u}"),
              (f"Fist.{s}", f"hand_{u}"), (f"UpperLeg.{s}", f"thigh_{u}"), (f"LowerLeg.{s}", f"calf_{u}"), (f"Foot.{s}", f"foot_{u}")]
    return m, "pelvis"

# library clips: name -> (armature, action)
SRC = {}
for lib in libs:
    objs = imported(lambda: bpy.ops.import_scene.gltf(filepath=lib))
    arm = next(o for o in objs if o.type == "ARMATURE")
    for o in objs:
        if o.type == "MESH": o.hide_render = True
    for act in bpy.data.actions:
        if act.name in clips and act.name not in SRC: SRC[act.name] = (arm, act)
missing = [c for c in clips if c not in SRC]
if missing: print("MISSING CLIPS", missing)

tb, hips_ratio = tgt.data.bones, tgt.data.bones["Hips"].head_local.z
BAKED = {}  # clip name -> baked action (Blender may have suffixed its name: the library action of that name exists)
for name, (src, act) in SRC.items():
    src.animation_data_create(); src.animation_data.action = act
    sb = src.data.bones
    MAP, root = make_map(src)
    ratio = hips_ratio / sb[root].head_local.z
    pairs = [(tgt.pose.bones[t], src.pose.bones[s], tb[t].matrix_local, sb[s].matrix_local.inverted()) for t, s in MAP if t in tb and s in sb]
    bake = bpy.data.actions.new(name); BAKED[name] = bake
    tgt.animation_data_create(); tgt.animation_data.action = bake
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    for f in range(f0, f1 + 1):
        scn.frame_set(f)
        for tpb, spb, trest, srest_inv in pairs:
            m = spb.matrix @ srest_inv @ trest                      # armature-space target pose (rotation + roll offset)
            loc = tpb.matrix.translation.copy() if tpb.name != "Hips" else spb.matrix.translation * ratio
            tpb.matrix = Matrix.Translation(loc) @ m.to_quaternion().to_matrix().to_4x4()
            bpy.context.view_layer.update()
        for tpb, *_ in pairs:
            tpb.keyframe_insert("rotation_quaternion", frame=f - f0, group=tpb.name)
            if tpb.name == "Hips": tpb.keyframe_insert("location", frame=f - f0, group=tpb.name)
    print(f"BAKED {name} {f1 - f0 + 1} frames")
    if preview:   # quick workbench render of the middle frame, front view, for checking
        scn.frame_set((f1 - f0) // 2)
        cam = bpy.data.objects.get("PreviewCam")
        if not cam:
            cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam")); scn.collection.objects.link(cam)
            cam.location = (2.2, -6.5, 1.7); cam.rotation_euler = (1.48, 0, 0.33); scn.camera = cam
        for o in bpy.data.objects:
            if o.type == "MESH" and o not in tgt_meshes: o.hide_render = True
        scn.render.engine = "BLENDER_WORKBENCH"; scn.render.resolution_x, scn.render.resolution_y = 360, 480
        scn.render.filepath = os.path.join(preview, f"{name}.png"); bpy.ops.render.render(write_still=True)

# export: the character mesh + rig + baked clips only (library actions removed, baked ones take the clip names)
for o in bpy.data.objects: o.select_set(o == tgt or o in tgt_meshes)
tgt.animation_data.action = None
for act in list(bpy.data.actions):
    if act not in BAKED.values(): bpy.data.actions.remove(act)
for name, act in BAKED.items(): act.name = name; act.use_fake_user = True
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="ACTIONS",
                          export_apply=False, export_extras=True)
print("EXPORTED", out)
