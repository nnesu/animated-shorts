# Trims long pauses in a voice take by MEASURED silence (never by Whisper word timings). The raw file is never changed.
# RMS in 10 ms windows; noise floor = 10th-percentile RMS; silence = below floor + 6 dB. Every silent run longer than
# 0.5 s is cut to 0.35 s around its centre with a 15 ms crossfade; a cut never comes within 40 ms of a speech window.
# Writes <out.wav> (mono, raw sample rate, 16-bit) and voice_trim.json next to it: raw and cut length, noise floor, each
# cut's start/end/removed (raw seconds) and a cumulative offset table: new_t = raw_t - shift of the last row with
# raw_t >= its "from". Easiest after a trim: re-run words_whisper.py on the cut file; the table is for shifting old timings.
# Usage: python scripts/voice_trim.py <raw.wav> <out.wav> [max_pause=0.5] [keep_pause=0.35]
# Needs ffmpeg + numpy.
import json, os, subprocess, sys, wave
import numpy as np

if len(sys.argv) < 3:
    sys.exit("usage: python scripts/voice_trim.py <raw.wav> <out.wav> [max_pause=0.5] [keep_pause=0.35]")
RAW, OUT = sys.argv[1], sys.argv[2]
MAX_PAUSE = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
KEEP = float(sys.argv[4]) if len(sys.argv) > 4 else 0.35
WIN, GUARD, XF = 0.010, 0.040, 0.015
if os.path.abspath(RAW) == os.path.abspath(OUT):
    sys.exit("out must differ from raw: the raw take is kept")

sr = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", RAW],
                        capture_output=True, text=True, check=True).stdout.strip().rstrip(","))
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", RAW, "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32)
w = int(sr * WIN)
nw = len(x) // w
rms_db = 20 * np.log10(np.sqrt((x[:nw * w].reshape(nw, w).astype(np.float64) ** 2).mean(1)) + 1e-10)
floor = float(np.percentile(rms_db, 10))
silent = rms_db < floor + 6

cuts, i = [], 0  # (start sample, end sample) of each removed span
while i < nw:
    if not silent[i]:
        i += 1; continue
    j = i
    while j < nw and silent[j]: j += 1
    a, b = i * w, (j * w if j < nw else len(x))  # silent run [a, b) in samples
    if (b - a) / sr > MAX_PAUSE:
        rem = (b - a) - int(KEEP * sr)
        cs = a + ((b - a) - rem) // 2
        assert cs - a >= GUARD * sr and b - (cs + rem) >= GUARD * sr  # never within 40 ms of speech
        cuts.append((cs, cs + rem))
    i = j

xf = int(XF * sr)
ramp = np.linspace(0, 1, xf, dtype=np.float32)
parts, pos = [], 0
for cs, ce in cuts:  # keep [pos, cs), then crossfade x[cs:cs+xf] out into x[ce:ce+xf] in: removes exactly ce - cs samples
    parts.append(x[pos:cs])
    parts.append(x[cs:cs + xf] * (1 - ramp) + x[ce:ce + xf] * ramp)
    pos = ce + xf
parts.append(x[pos:])
y = np.concatenate(parts) if parts else x
assert len(y) == len(x) - sum(ce - cs for cs, ce in cuts)

with wave.open(OUT, "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr)
    f.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())

shift, table = 0.0, [{"from": 0.0, "shift": 0.0}]
for cs, ce in cuts:
    shift += (ce - cs) / sr
    table.append({"from": round(ce / sr, 4), "shift": round(shift, 4)})
rep = {"raw": os.path.abspath(RAW), "out": os.path.abspath(OUT), "sample_rate": sr, "raw_s": round(len(x) / sr, 4), "cut_s": round(len(y) / sr, 4),
       "noise_floor_db": round(floor, 2), "silence_threshold_db": round(floor + 6, 2), "max_pause_s": MAX_PAUSE, "keep_pause_s": KEEP,
       "cuts": [{"start": round(cs / sr, 4), "end": round(ce / sr, 4), "removed": round((ce - cs) / sr, 4)} for cs, ce in cuts],
       "offsets": table,
       "note": "new_t = raw_t - shift of the last row whose 'from' <= raw_t (times inside a cut map to its start). Or re-run words_whisper.py on the cut file."}
js = os.path.join(os.path.dirname(os.path.abspath(OUT)), "voice_trim.json")
json.dump(rep, open(js, "w", encoding="utf-8"), indent=1)
print(f"{rep['raw_s']} s -> {rep['cut_s']} s, {len(cuts)} cuts, floor {floor:.1f} dB -> {OUT}, {js}")
