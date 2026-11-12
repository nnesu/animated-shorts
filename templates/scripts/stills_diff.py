# Which shots did a code change alter? Compares re-rendered mid-shot stills with the approved ones (ffmpeg + numpy, no Pillow).
# usage: python scripts/stills_diff.py <shots.json> <old prefix> <new prefix> [mean=4] [pct=3]
#   e.g. python scripts/stills_diff.py out/<name>/shots.json out/<name>/qa_ out/<name>/new_
# Pairs <new prefix><frame>.jpg with <old prefix><frame>.jpg. A frame is CHANGED when the mean absolute grey difference is
# over `mean` (0-255) or more than `pct` % of pixels differ by over 40. Prints one line per pair, then the --redo ranges
# for render_chunks.mjs: each changed shot's frames widened by the crossfades at both of its ends. Exit 1 if any changed.
import glob, json, re, subprocess, sys

import numpy as np

if len(sys.argv) < 4:
    sys.exit("usage: python scripts/stills_diff.py <shots.json> <old prefix> <new prefix> [mean=4] [pct=3]")
meta, OLD, NEW = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
MEAN = float(sys.argv[4]) if len(sys.argv) > 4 else 4.0
PCT = float(sys.argv[5]) if len(sys.argv) > 5 else 3.0
W, H = 540, 960


def grey(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    if len(raw) != W * H:
        sys.exit(f"cannot read {path}")
    return np.frombuffer(raw, np.uint8).astype(np.int16)


ranges, odd = [], []
for f, new in sorted((int(m.group(1)), p) for p in glob.glob(glob.escape(NEW) + "*.jpg") if (m := re.fullmatch(r"(\d+)\.jpg", p[len(NEW):]))):
    d = np.abs(grey(new) - grey(f"{OLD}{f}.jpg"))
    mean, pct = float(d.mean()), float((d > 40).mean() * 100)
    shot = next((s for s in meta["shots"] if s["a"] <= f < s["b"]), None)
    changed = mean > MEAN or pct > PCT
    print(f"{'CHANGED' if changed else 'same   '} frame {f} shot {shot['id'] if shot else '?'} mean {mean:.1f} pct {pct:.1f}")
    if changed and not shot:
        odd.append(f)
    if changed and shot:
        a, b = shot["a"], shot["b"] - 1
        for x0, x1 in meta.get("xfade", []):
            if x0 <= shot["a"] <= x1: a = min(a, x0)
            if x0 <= shot["b"] <= x1: b = max(b, x1)
        ranges.append([a, b])
ranges.sort()
merged = []
for a, b in ranges:
    if merged and a <= merged[-1][1] + 1: merged[-1][1] = max(merged[-1][1], b)
    else: merged.append([a, b])
if odd:
    print("changed frames outside every shot (stale shots.json?): " + " ".join(map(str, odd)))
print("--redo " + ",".join(f"{a}-{b}" for a, b in merged) if merged else "no shot changed")
sys.exit(1 if merged or odd else 0)
