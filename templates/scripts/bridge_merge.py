# Merge the look sandboxes back into the main video folder, by owned files.
# Backs up main and src/shared first (backup/<name>_<time>/ and backup/<name>_<time>/_shared/), copies each sandbox's
# owned files, reports which owned files are missing or unchanged.
# Usage (from the Remotion project root): python scripts/bridge_merge.py <name> [cam,world,mat,char,post]  (post owns the folder's .tsx composition file)
import os, shutil, sys, time, filecmp

if len(sys.argv) < 2 or sys.argv[1].startswith("-"):
    sys.exit("usage: python scripts/bridge_merge.py <name> [cam,world,mat,char,post]   (<name> = folder in src/videos/)")
NAME = sys.argv[1]
ROOT = os.getcwd()  # run from the Remotion project root
MAIN = os.path.join(ROOT, "src/videos", NAME)
SHARED_DIR = os.path.join(ROOT, "src/shared")
TSX = next((f for f in sorted(os.listdir(MAIN)) if f.endswith(".tsx")), "Bridge.tsx") if os.path.isdir(MAIN) else "Bridge.tsx"
if not os.path.isdir(MAIN):
    sys.exit(f"no folder {MAIN}")
OWN = {  # round 2 ownership (round 1: world also owned paint/build, post owned grade)
    "cam": ["story.ts", "camkit.ts"],
    "world": ["world.ts", "worldkit.ts", "lights.ts", "shade.ts", "grade.ts"],
    "mat": ["paint.ts", "build.ts"],
    "char": ["toon.ts", "cast.ts", "castkit.ts", "cardshade.ts"],
    "post": ["ink.ts", TSX, "short.tsx", "lensblur.ts"],
}
SHARED = {"ink.ts", "lensblur.ts", "grade.ts", "shade.ts", "lights.ts", "cardshade.ts", "paint.ts", "toon.ts", "castkit.ts", "worldkit.ts", "camkit.ts", "short.tsx"}
which = sys.argv[2].split(",") if len(sys.argv) > 2 else list(OWN)
bak = os.path.join(ROOT, "backup", time.strftime(f"{NAME}_%Y%m%d_%H%M%S"))
shutil.copytree(MAIN, bak)
shutil.copytree(SHARED_DIR, os.path.join(bak, "_shared"))  # shared look files are overwritten too
print("backup ->", bak)
for box in which:
    src = os.path.join(ROOT, f"src/videos/{NAME}_{box}")
    for f in OWN[box]:
        shared = f in SHARED  # shared look files live in src/shared (sandbox copy: src/shared_<box>)
        a = os.path.join(ROOT, f"src/shared_{box}", f) if shared else os.path.join(src, f)
        b = os.path.join(SHARED_DIR, f) if shared else os.path.join(MAIN, f)
        if not os.path.exists(a):
            print(f"  {box}: {f} not in sandbox (skipped)")
            continue
        if os.path.exists(b) and filecmp.cmp(a, b, shallow=False):
            print(f"  {box}: {f} unchanged")
            continue
        shutil.copy2(a, b)
        print(f"  {box}: {f} -> main")
