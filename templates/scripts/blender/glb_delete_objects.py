# Delete named mesh objects from a glb (e.g. the containers of CargoShip02: Object_8..16,22,40).
# blender -b -P scripts/blender/glb_delete_objects.py -- <in.glb> <out.glb> <Name1,Name2,...>
import bpy, sys
a=sys.argv[sys.argv.index("--")+1:]; src,out,names=a[0],a[1],a[2].split(",")
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type=="MESH" and o.name in names: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="JPEG")
