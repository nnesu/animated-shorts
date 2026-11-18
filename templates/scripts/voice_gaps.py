# List (and optionally even out) the pauses in a voice file: a pause = run of 10 ms windows below speech level - 30 dB
# (catches breaths too). Usage: python scripts/voice_gaps.py <voice.wav> [--set 0.2 <out.wav> <map.json>]
# --set: every pause longer than the target is cut to the target (around its centre); map.json holds
# [[old_s, new_s], ...] knots of the piecewise-linear old->new time map (for retiming a finished timeline).
import json, sys, wave
import numpy as np
src = sys.argv[1]
with wave.open(src) as f:
    sr, n, ch, sw = f.getframerate(), f.getnframes(), f.getnchannels(), f.getsampwidth()
    x = np.frombuffer(f.readframes(n), dtype=np.int16).astype(np.float32).reshape(-1, ch).mean(1) / 32768
W = int(sr * 0.01); m = len(x) // W
db = 20 * np.log10(np.sqrt((x[:m * W].reshape(m, W) ** 2).mean(1)) + 1e-9)
quiet = db < np.percentile(db, 90) - 30
runs, i = [], 0
while i < m:
    if quiet[i]:
        j = i
        while j < m and quiet[j]: j += 1
        if i > 0 and j < m and (j - i) * 0.01 >= 0.12: runs.append((i * 0.01, j * 0.01))
        i = j
    else: i += 1
if "--set" not in sys.argv:
    for a, b in runs: print(f"{a:7.2f} {b - a:5.2f}")
    sys.exit()
k = sys.argv.index("--set"); T = float(sys.argv[k + 1]); out, mp = sys.argv[k + 2], sys.argv[k + 3]
segs, knots, pos, newt = [], [[0.0, 0.0]], 0, 0.0
for a, b in runs:
    if b - a <= T: continue
    c0, c1 = a + T / 2, b - T / 2  # keep T/2 after the speech and T/2 before the next
    segs.append(x[int(pos * sr):int(c0 * sr)]); newt += c0 - pos; knots.append([c0, newt]); knots.append([c1, newt]); pos = c1
segs.append(x[int(pos * sr):]); newt += len(x) / sr - pos; knots.append([len(x) / sr, newt])
y = np.concatenate(segs)  # joins sit inside the quiet runs: no crossfade, so the time map stays exact
with wave.open(out, "w") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump(knots, open(mp, "w"))
assert abs(len(y) / sr - knots[-1][1]) < 0.002, (len(y) / sr, knots[-1][1])
print(f"{len(segs) - 1} pauses cut to {T} s: {len(x) / sr:.2f} -> {len(y) / sr:.2f} s")
