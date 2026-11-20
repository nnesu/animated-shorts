# Golden-hour "shader" film finish (house look, every short), applied with ffmpeg after the render, before the mix:
# (1) halation: blurred copy (50 px at 1080 wide) screened at 10 %; (2) grade: midtones toward warm amber (#ffb86c overlay
# at 6 %), highlights pulled down so gold does not clip, shadows cool blue-violet; (2b) S-curve contrast, saturation 1.16,
# glow from the brightest (sunlit) areas only; (3) film grain ~2.5 % only with --grain (off: it bloats files);
# (4) soft vignette, corners ~12 % darker. --story: the zone-cut frames in its `WHIPS = [...]` get a horizontal motion blur.
# Stills never show this finish: judge the look on video, or run it on a still (image in, image out).
# usage: python scripts/film_finish.py <in.mp4 | image> <out> [--story src/videos/<name>/story.ts] [--grain]
import subprocess, sys, json, re
src, out = sys.argv[1], sys.argv[2]
grain = "--grain" in sys.argv
story = sys.argv[sys.argv.index("--story") + 1] if "--story" in sys.argv else None
m = re.search(r"WHIPS\s*=\s*\[([\d,\s]*)\]", open(story, encoding="utf8").read()) if story else None
WHIPS = [int(x) for x in m.group(1).replace(" ", "").split(",") if x] if m else []
st = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", src],
                               capture_output=True, text=True, check=True).stdout)["streams"][0]
w, h = st["width"], st["height"]
k = w / 1080  # blur scales with resolution (50 px at 1080, 100 px at 2160)
video = src.lower().endswith(".mp4")
whip = "".join(f"avgblur=sizeX={int(s * k)}:sizeY=1:enable='between(n,{c - d},{c + d - 1})'," for c in WHIPS for d, s in ((5, 14), (3, 30), (1, 46))) if video else ""
graph = (
    # both wide blurs run at quarter size and scale back (16x fewer pixels, same look)
    f"[0:v]{whip}format=gbrp,split=2[a][b];[b]scale=iw/4:ih/4,gblur=sigma={25 * k / 4:.2f},scale={w}:{h}[bl];"
    f"[a][bl]blend=all_mode=screen:all_opacity=0.10[h];"
    f"color=c=0xffb86c:s={w}x{h},format=gbrp[amb];[h][amb]blend=all_mode=overlay:all_opacity=0.06:shortest=1[t];"  # the colour source is endless: stop with the video
    "[t]colorbalance=rm=0.05:gm=0.015:bm=-0.05:rs=-0.02:gs=-0.01:bs=0.04,"
    "curves=all='0/0 0.25/0.16 0.5/0.5 0.8/0.87 1/0.97',eq=saturation=1.16,split=2[g][hl];"
    f"[hl]curves=all='0/0 0.74/0 1/1',scale=iw/4:ih/4,gblur=sigma={14 * k / 4:.2f},scale={w}:{h}[glow];[g][glow]blend=all_mode=screen:all_opacity=0.3,"
    + ("noise=alls=6:allf=t," if grain else "")
    + "vignette=angle=0.42:mode=forward,format=yuv420p[v]"
)
cmd = ["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", graph, "-map", "[v]"]
if video: cmd += ["-map", "0:a?", "-c:a", "copy", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-shortest"]
else: cmd += ["-frames:v", "1", "-update", "1"]
subprocess.run(cmd + [out], check=True)
print("wrote", out)
