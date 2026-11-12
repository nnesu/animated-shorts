"""Scripted pixel checks on still frames (no model, no Pillow: frames are decoded with ffmpeg, maths with numpy).
usage: python scripts/qa_stills.py <frame.png|jpg> [more frames ...]   (prints one line per frame; exit 1 if any frame has a FAIL)
Checks (9 x 16 tile grid (60 px tiles) on a 540x960 frame):
  black      a tile with mean luma < 8 (a black hole). Frames meant to be dark need to be listed with --dark-ok.
  magenta    more than 0.5 % of pixels near (255, 0, 255) (placeholder / missing texture colour)
  flat       tiles with almost no edge energy (flat paint) covering more than FLAT_PCT of the frame. Depth-of-field backgrounds and plain
             floors are flat on purpose, so this check is calibrated on the video's own good frames (see NOISE below); it only counts as a
             defect when the share is clearly above the good-frame range.
Calibration note: run it on known-good frames first and set FLAT_PCT above their maximum (flag with --flat-pct N)."""
import subprocess, sys
import numpy as np

W, H, GX, GY = 540, 960, 9, 16


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32)


def tiles(a):
    return a.reshape(GY, H // GY, GX, W // GX).transpose(0, 2, 1, 3).reshape(GY, GX, -1)


def check(path, flat_pct=35.0, dark_ok=False):
    img = load(path)
    luma = img @ np.array([0.299, 0.587, 0.114], np.float32)
    gy, gx = np.gradient(luma)
    energy = np.hypot(gx, gy)
    tl, te = tiles(luma).mean(-1), tiles(energy).mean(-1)
    out = {}
    out["black"] = int((tl < 8).sum()) if not dark_ok else 0
    mag = (img[..., 0] > 200) & (img[..., 1] < 60) & (img[..., 2] > 200)
    out["magenta_pct"] = round(float(mag.mean() * 100), 2)
    out["flat_pct"] = round(float((te < 1.0).mean() * 100), 1)
    out["fails"] = [k for k, bad in (("black", out["black"] > 0), ("magenta", out["magenta_pct"] > 0.5), ("flat", out["flat_pct"] > flat_pct)) if bad]
    return out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flat = float(sys.argv[sys.argv.index("--flat-pct") + 1]) if "--flat-pct" in sys.argv else 35.0
    if "--flat-pct" in sys.argv: args = [a for a in args if a != str(flat) and a != sys.argv[sys.argv.index("--flat-pct") + 1]]
    bad = 0
    for p in args:
        r = check(p, flat, "--dark-ok" in sys.argv)
        bad += bool(r["fails"])
        print(f"{p}: black_tiles={r['black']} magenta={r['magenta_pct']}% flat={r['flat_pct']}%  {'FAIL ' + ','.join(r['fails']) if r['fails'] else 'ok'}")
    sys.exit(1 if bad else 0)
