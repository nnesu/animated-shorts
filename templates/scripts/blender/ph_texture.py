# Put real textures on flat-colour library models: every material whose name matches a keyword gets a Poly Haven CC0
# diffuse texture (public/models/polyhaven-tex/<id>.jpg), tinted to the material's own colour (so the model keeps its
# palette), mapped by box projection in metres at the height the video uses (so tiles are real size).
# blender -b -P scripts/blender/ph_texture.py -- <in.glb> <out.glb> <texdir> <height_m>
import bpy, bmesh, sys, os
import numpy as np
src, out, texdir, height = sys.argv[sys.argv.index("--") + 1:][:4]
height = float(height)

# material-name keyword -> (texture id, tile size in metres); first match wins
RULES = [("brick", "red_brick_03", 1.6), ("plaster", "white_plaster_02", 2.0), ("beige", "white_plaster_02", 2.0), ("yellow", "white_plaster_02", 2.0),
  ("white", "white_plaster_02", 2.0), ("blue", "blue_metal_plate", 1.5), ("red", "rusty_painted_metal", 1.5), ("green", "rusty_painted_metal", 1.5),
  ("orange", "painted_concrete", 0.8), ("wood", "wood_table_001", 0.9), ("brown", "wood_table_001", 0.9), ("cardboard", "plywood", 0.8),
  ("tape", "plywood", 0.8), ("bag", "plywood", 0.6), ("leather", "denim_fabric", 0.4), ("chair", "denim_fabric", 0.4), ("fabric", "denim_fabric", 0.4),
  ("black", "rubber_tiles", 0.6), ("metal", "metal_plate_02", 1.0), ("grey", "metal_plate_02", 1.2)]
SKIP = ("light", "glass", "window")  # emissive / glass stay flat

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
zs = [(o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
scale = height / max(1e-6, max(zs) - min(zs))  # model units -> metres

cache = {}
def tinted(tex_id, rgb):
    key = (tex_id, tuple(round(c, 3) for c in rgb))
    if key in cache: return cache[key]
    base = bpy.data.images.load(os.path.join(texdir, tex_id + ".jpg"))
    a = np.array(base.pixels[:], dtype=np.float32).reshape(-1, 4)
    mean = a[:, :3].mean(axis=0)
    a[:, :3] = np.clip(a[:, :3] / np.maximum(mean, 1e-3) * np.array(rgb, dtype=np.float32), 0, 1)  # texture detail around the model's colour
    img = bpy.data.images.new(f"{tex_id}_{len(cache)}", base.size[0], base.size[1])
    img.pixels = a.ravel().tolist(); img.file_format = "JPEG"; img.pack()
    cache[key] = img; return img

done = {}
for m in {m for o in meshes for m in o.data.materials if m}:
    n = m.name.lower()
    if n in SKIP or "glass" in n or "window" in n or not m.use_nodes: continue  # "light" alone = a lamp; LightBlue / LightMetal are paint
    rule = next((r for r in RULES if r[0] in n), None)
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if not rule or not bsdf or bsdf.inputs["Base Color"].is_linked: continue
    rgb = list(bsdf.inputs["Base Color"].default_value)[:3]
    tex = m.node_tree.nodes.new("ShaderNodeTexImage"); tex.image = tinted(rule[1], rgb)
    m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    done[m.name] = rule[2]

# box projection in metres for every face that uses a textured material
for o in meshes:
    mw = o.matrix_world
    bm = bmesh.new(); bm.from_mesh(o.data)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        mat = o.data.materials[f.material_index] if f.material_index < len(o.data.materials) else None
        if not mat or mat.name not in done: continue
        tile = done[mat.name]
        nrm = (mw.to_3x3() @ f.normal); ax = max(range(3), key=lambda i: abs(nrm[i]))
        for l in f.loops:
            p = mw @ l.vert.co * scale
            u, v = [(p.y, p.z), (p.x, p.z), (p.x, p.y)][ax]
            l[uv].uv = (u / tile, v / tile)
    bm.to_mesh(o.data); bm.free()
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="JPEG")
print("ph_texture done", os.path.basename(out), sorted(done))
