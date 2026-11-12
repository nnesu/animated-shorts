"""Builds a short's sound mix: voice + FREE CC0 sound effects (see _sfx/LICENSES.md) + optional scene-based music cues.
Usage (from the project root):
    python build_mix.py <voice.wav> <video_silent.mp4> <out dir> <events.json> [music.wav]
        -> <out dir>/mix.wav, <out dir>/music_ducked.wav (only with music) and <out dir>/video_final.mp4 (video copied, audio muxed)
Music (optional): the wav from music_cues.py (scene cues on silence, exactly the video length; anything else is refused).
It is levelled to MUSIC_UNDER_DB under the voice (measured LUFS of both), then ducked by a sidechain compressor keyed by the
voice (about 12-18 dB under the voice while speaking). Cues: library first, else generate (music_example.py, numpy only).
events.json: [[time s, file, gain dB, trim s or null, fade-out s or null], ...]; files are relative to the events file's
folder (e.g. "raw/kenney/impact-sounds/Audio/impactWood_heavy_001.ogg"). Time events to words.json and the story kicks.
The mix length is the video length (ffprobe)."""
import json, os, subprocess, sys

if len(sys.argv) not in (5, 6):
    sys.exit(__doc__)
VOICE, VIDEO, OUT, EV = (os.path.abspath(a) for a in sys.argv[1:5])
MUSIC = os.path.abspath(sys.argv[5]) if len(sys.argv) == 6 else None
MUSIC_UNDER_DB = 11  # music bed level under the voice before ducking (integrated LUFS of each)
MUSIC_FADE_IN, MUSIC_FADE_OUT = 1.5, 2.5
DUCK = "sidechaincompress=threshold=0.03:ratio=2:attack=40:release=450:knee=4"  # keyed by the voice: measured ~6 dB more under a -21 dBFS RMS test voice (17.6 dB under it; check music_ducked.wav)
SFX_TRIM_DB = -6    # all effects sit about 6 dB under the voice (skill standard)
TARGET_LUFS = -15


def lufs_of(f):  # integrated loudness (ebur128)
    m = subprocess.run(["ffmpeg", "-nostats", "-i", f, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float([l for l in m.splitlines() if l.strip().startswith("I:")][-1].split()[1])


def dur(f):  # length in seconds (ffprobe)
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, check=True).stdout)


for f in (VOICE, VIDEO, EV) + ((MUSIC,) if MUSIC else ()):
    if not os.path.exists(f):
        sys.exit(f"missing {f}")
TOTAL = dur(VIDEO)
base = os.path.dirname(EV)
EVENTS = [(t, os.path.join(base, f), g, trim, fade) for t, f, g, trim, fade in json.load(open(EV, encoding="utf-8"))]
missing = [f for _, f, *_ in EVENTS if not os.path.exists(f)]
if missing:
    print("MISSING:", *missing, sep="\n  "); sys.exit(1)
os.makedirs(OUT, exist_ok=True)

inputs = ["-i", VOICE]
chains = [f"[0:a]aformat=sample_rates=48000:channel_layouts=mono,apad=whole_dur={TOTAL}[v]"]
labels = ["[v]"]
if MUSIC:
    mg = max(-40, min(20, lufs_of(VOICE) - MUSIC_UNDER_DB - lufs_of(MUSIC)))  # clamp: a near-silent cue file gives -inf LUFS
    cued = abs(dur(MUSIC) - TOTAL) < 0.05  # music_cues.py output: exact video length, own fades -> no loop, no global fades
    if not cued: sys.exit("music must be music_cues.py output for this video (scene cues, exact video length), not a continuous track")
    MUSIC_FADE_IN = MUSIC_FADE_OUT = 0.001  # cues carry their own fades
    inputs = ["-i", VOICE] + ([] if cued else ["-stream_loop", "-1"]) + ["-i", MUSIC]
    chains = [chains[0].replace("[v]", "[v0]"), "[v0]asplit=2[v][key]",
              f"[1:a]aformat=sample_rates=48000:channel_layouts=mono,atrim=0:{TOTAL},asetpts=PTS-STARTPTS,volume={mg:.2f}dB,"
              f"afade=t=in:d={MUSIC_FADE_IN},afade=t=out:st={max(0, TOTAL - MUSIC_FADE_OUT):.3f}:d={MUSIC_FADE_OUT}[m0]",
              f"[m0][key]{DUCK}[md]", "[md]asplit=2[m][mstem]"]
    labels = ["[v]", "[m]"]
for i, (t, f, g, trim, fade) in enumerate(EVENTS, start=1 + bool(MUSIC)):
    inputs += ["-i", f]
    c = f"[{i}:a]aformat=sample_rates=48000:channel_layouts=mono"
    if trim: c += f",atrim=0:{trim},asetpts=PTS-STARTPTS"
    if fade: c += f",afade=t=out:st={max(0, (trim or dur(f)) - fade):.3f}:d={fade}"
    c += f",volume={g + SFX_TRIM_DB}dB,adelay={int(t * 1000)}:all=1[s{i}]"
    chains.append(c); labels.append(f"[s{i}]")
# duration=first: the padded voice sets the length; L=R stereo adds 3 LU, so measure after the pan
chains.append("".join(labels) + f"amix=inputs={len(labels)}:duration=first:normalize=0,pan=stereo|c0=c0|c1=c0[out]")
script = os.path.join(OUT, "filter.txt")
open(script, "w", encoding="utf-8").write(";\n".join(chains))
RAW_MIX, MIX, OUTV = (os.path.join(OUT, n) for n in ("mix_raw.wav", "mix.wav", "video_final.mp4"))
stem = ["-map", "[mstem]", "-c:a", "pcm_s16le", os.path.join(OUT, "music_ducked.wav")] if MUSIC else []  # pre-gain stem, to check the duck
r = subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-/filter_complex", script, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s16le", RAW_MIX, *stem])
if r.returncode: sys.exit(r.returncode)
# measure, then one exact gain to the target loudness and a limiter (sample peak; level=disabled stops its auto-gain)
lufs = lufs_of(RAW_MIX)
gain = TARGET_LUFS - lufs
r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", RAW_MIX, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=disabled", "-ar", "48000", "-c:a", "pcm_s16le", MIX])
if r.returncode: sys.exit(r.returncode)
print(f"raw {lufs:.1f} LUFS, gain {gain:+.1f} dB -> target {TARGET_LUFS}, length {TOTAL:.3f} s")
print("mix ->", MIX)
r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", VIDEO, "-i", MIX, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", OUTV])
print("video ->", OUTV if r.returncode == 0 else "FAILED")
sys.exit(r.returncode)
