# Frame-by-frame QA of a rendered vertical short (every frame at 30 fps): specs, loudness, per-frame luma / saturation /
# motion, black-white-frozen-pop detection (ignoring planned flashes and crossfades), per-shot colour stats and 2 s
# contact sheets (60 frames each, frame numbers burned in for the reviewer only).
# Pass/fail checks (ffprobe/ffmpeg only, lines starting FAIL, exit code 1 on any): audio vs video stream length (> 1 frame),
# frame count = round(duration x fps), length vs --voice wav (> 1 frame), black / unplanned white / frozen spans
# (blackdetect, negate+blackdetect, freezedetect), loudness -15 LUFS +-1 and true peak <= -1 dBFS (ebur128).
# Usage: python scripts/short_qa.py <video.mp4> <outdir> [shots.json] [--voice voice.wav]
#   shots.json: {"shots":[{"id":1,"a":0,"b":130}, ...], "flash":[130,134], "xfade":[[1131,1137], ...]} (flash, xfade optional)
#   Without numpy the per-frame stats and sheets are skipped; the pass/fail checks still run.
import json, os, re, subprocess, sys
try:
    import numpy as np
except ImportError:
    np = None
try:
    from PIL import Image, ImageDraw
except ImportError:  # shortcut: no Pillow -> skip the contact sheets, all checks still run; install pillow to get sheets back
    Image = None

args = sys.argv[1:]
voice = None
if "--voice" in args:
    k = args.index("--voice"); voice = args[k + 1]; del args[k:k + 2]
vid, out = args[0], args[1]
meta = json.load(open(args[2])) if len(args) > 2 else {}
shots = meta.get("shots", [])
planned = set()
for a, b in meta.get("xfade", []) + meta.get("planned", []) + ([meta["flash"]] if "flash" in meta else []):
    planned.update(range(a - 1, b + 1))
for s in shots:
    planned.update((s["a"] - 1, s["a"]))
os.makedirs(out, exist_ok=True)
run = lambda *a: subprocess.run(a, capture_output=True, text=True)
R, FAILS = [], []


def check(bad, msg):
    R.append(("FAIL " if bad else "ok   ") + msg)
    if bad: FAILS.append(msg)


def done():
    R.append(f"\nRESULT: {len(FAILS)} FAIL(s)" + "".join(f"\n  - {f}" for f in FAILS))
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(R) + "\n")
    print("\n".join(R))
    sys.exit(1 if FAILS else 0)


pr = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels,duration:format=duration", "-of", "json", vid).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video")
au = [s for s in pr["streams"] if s["codec_type"] == "audio"]
R.append(f"SPECS {v['width']}x{v['height']} {v['r_frame_rate']} fps, {v.get('nb_frames')} frames, {float(pr['format']['duration']):.3f} s; audio: "
         + (", ".join(f"{s['codec_name']} {s['sample_rate']} Hz {s['channels']}ch" for s in au) if au else "NONE"))
if au:
    e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    tail = e[e.rfind("Summary:"):]
    I = [l.strip() for l in tail.splitlines() if l.strip().startswith(("I:", "LRA:", "Peak:"))]
    R.append("LOUDNESS " + " | ".join(I))
    e = run("ffmpeg", "-i", vid, "-map", "0:a:0", "-af", "silencedetect=n=-45dB:d=0.3", "-f", "null", "-").stderr
    R.append("SILENCES " + ("; ".join(l.split("] ")[-1] for l in e.splitlines() if "silence_" in l) or "none"))

# ---- pass/fail checks (ffprobe/ffmpeg only) ----
num, den = map(int, v["r_frame_rate"].split("/")); fps = num / den; fr = 1 / fps
fdur, vdur = float(pr["format"]["duration"]), float(v.get("duration") or pr["format"]["duration"])
check(int(v.get("nb_frames") or -1) != round(fdur * fps),
      f"frame count {v.get('nb_frames')} vs round(duration {fdur:.3f} s x {fps:g}) = {round(fdur * fps)}")
if au:
    adur = float(au[0].get("duration") or fdur)
    check(abs(adur - vdur) > fr, f"audio {adur:.3f} s vs video {vdur:.3f} s (gap {abs(adur - vdur):.3f} s, limit 1 frame {fr:.3f})")
    tail = run("ffmpeg", "-nostats", "-i", vid, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-").stderr
    tail = tail[tail.rfind("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", tail).group(1))
    tp = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", tail[tail.find("True peak"):]).group(1)
    check(abs(I + 15) > 1, f"loudness {I:.1f} LUFS (target -15 +-1)")
    check(float(tp) > -1, f"true peak {tp} dBFS (limit -1)")
else:
    check(True, "no audio stream")
if voice:
    vl = float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice).stdout)
    check(abs(fdur - vl) > fr, f"length {fdur:.3f} s vs voice {vl:.3f} s (limit 1 frame {fr:.3f})")


def spans(vf, key):  # [(start s, end s)] of blackdetect / freezedetect events on a small proxy
    e = run("ffmpeg", "-nostats", "-i", vid, "-an", "-vf", "scale=180:320," + vf, "-f", "null", "-").stderr
    if key == "black":
        return [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", e)]
    st = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", e)]
    en = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", e)]
    return list(zip(st, en + [fdur] * (len(st) - len(en))))


pf = lambda sp: [f for a, b in sp for f in range(int(a * fps), int(round(b * fps)))]
black = spans("blackdetect=d=0.06:pix_th=0.10", "black")
white = [sp for sp in spans("negate,blackdetect=d=0.06:pix_th=0.10", "black") if not set(pf([sp])) <= planned]
freeze = spans(f"freezedetect=n=0.003:d={12 / fps:.3f}", "freeze")
check(bool(black), f"black spans (s) {black[:10]}")
check(bool(white), f"unplanned white spans (s) {white[:10]}")
check(bool(freeze), f"frozen spans >= 12 f (s) {freeze[:10]}")
if np is None:
    R.append("PER-FRAME stats and sheets skipped (no numpy)")
    done()

W, H = 180, 320
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
n = len(F)
f32 = F.astype(np.float32) / 255
luma = (f32 @ np.array([0.2126, 0.7152, 0.0722], np.float32))
mx, mn = f32.max(-1), f32.min(-1)
sat = np.where(mx > 0.06, (mx - mn) / np.maximum(mx, 1e-6), 0)
L = luma.reshape(n, -1)
stats = {"mean": L.mean(1), "std": L.std(1), "p2": np.percentile(L, 2, 1), "p98": np.percentile(L, 98, 1), "sat": sat.reshape(n, -1).mean(1)}
diff = np.abs(np.diff(F.astype(np.int16), axis=0)).mean(axis=(1, 2, 3))
med = np.array([np.median(diff[max(0, i - 8):i + 9]) for i in range(len(diff))])
pops = [i + 1 for i in range(len(diff)) if diff[i] > 3 * med[i] + 1.0 and (i + 1) not in planned]
black = [i for i in range(n) if stats["mean"][i] < 0.04]
white = [i for i in range(n) if stats["mean"][i] > 0.93 and i not in planned]
frozen, run_start = [], None
for i in range(len(diff)):
    if diff[i] < 0.02:
        run_start = i if run_start is None else run_start
    else:
        if run_start is not None and i - run_start >= 12: frozen.append((run_start, i))
        run_start = None
R.append(f"FRAMES {n}; black {black[:20]}; unplanned white {white[:20]}; frozen spans >=12f {frozen[:20]}")
R.append(f"POPS (unplanned frame-diff spikes > 3x local median): {pops[:40]}")
R.append(f"MOTION mean diff {diff.mean():.2f}; frames with diff<0.3 (held): {int((diff < 0.3).sum())} ({(diff < 0.3).mean() * 100:.0f}%)")

R.append("\nPER SHOT  (luma mean / std / p2 / p98 / saturation mean, medians over the shot)")
for s in shots or [{"id": 0, "a": 0, "b": n}]:
    a, b = s["a"], min(s["b"], n)
    if a >= b: continue
    R.append(f"  shot {s['id']:>2} f{a}-{b - 1}: " + " / ".join(f"{np.median(stats[k][a:b]):.3f}" for k in ("mean", "std", "p2", "p98", "sat")))
np.savez(os.path.join(out, "perframe.npz"), diff=diff, **stats)

# 2 s contact sheets, 10 x 6 frames of 108x192 each
cw, ch = 108, 192
for k in (range(0, n, 60) if Image else []):
    S = Image.new("RGB", (cw * 10, ch * 6), "black"); d = ImageDraw.Draw(S)
    for j in range(min(60, n - k)):
        x, y = (j % 10) * cw, (j // 10) * ch
        S.paste(Image.fromarray(F[k + j]).resize((cw, ch)), (x, y))
        d.rectangle([x, y, x + 34, y + 12], fill="black"); d.text((x + 2, y + 1), str(k + j), fill="yellow")
    S.save(os.path.join(out, f"sheet_{k:04d}.jpg"), quality=85)
done()
