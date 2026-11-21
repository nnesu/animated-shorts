# Bake a rigged glb to a static mesh in its rest pose (kitClone of a skinned mesh renders nothing).
# blender -b -P scripts/blender/glb_static.py -- <in.glb> <out.glb>
# bake a rigged glb to a static mesh (rest pose): apply armature modifiers, drop the armature
import bpy, sys
a=sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
for o in [o for o in bpy.data.objects if o.type=="MESH"]:
    bpy.context.view_layer.objects.active=o
    for m in list(o.modifiers):
        if m.type=="ARMATURE": bpy.ops.object.modifier_apply(modifier=m.name)
    o.parent=None
for o in [o for o in bpy.data.objects if o.type=="ARMATURE"]: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=a[1], export_format="GLB", export_animations=False, export_skins=False)
print("static done")
