"""Scene-based music: places short music cues on a silent timeline -> one music.wav for build_mix.py (5th argument).
    python music_cues.py <video.mp4> <cues.json> <out music.wav>
cues.json: [[start s, file, gain dB, length s|null, fade-in s, fade-out s], ...]  (one cue per scene/mood; gaps stay silent; files relative to cues.json's folder)
Silence IS part of the score (e.g. stop the music on the snap). Output is exactly the video length, so build_mix.py does not loop it."""
import json, os, subprocess, sys
V, C, O = sys.argv[1:4]
tot = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", V]))
cues = json.load(open(C))
if not cues: sys.exit("no cues")
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
args, fc = ["ffmpeg", "-y", "-v", "error"], []
for i, (t, f, g, ln, fi, fo) in enumerate(cues):
    f = os.path.join(os.path.dirname(os.path.abspath(C)), f); fi, fo = max(fi or 0, 0.001), max(fo or 0, 0.001)
    args += ["-i", f]
    L = min(ln or 1e9, dur(f), tot - t)  # never longer than the file or the video, so the fade-out always lands
    d = f"atrim=0:{L:.3f},"
    fc.append(f"[{i}:a]{d}aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,afade=t=in:d={fi},afade=t=out:st={max(0, L - fo):.3f}:d={fo},adelay={int(t * 1000)}:all=1[c{i}]")
fc.append("".join(f"[c{i}]" for i in range(len(cues))) + f"amix=inputs={len(cues)}:normalize=0:duration=longest,apad=whole_dur={tot},atrim=0:{tot}[o]")
open(O + ".fc.txt", "w").write(";".join(fc))
subprocess.run(args + ["-/filter_complex", O + ".fc.txt", "-map", "[o]", "-c:a", "pcm_f32le", O], check=True)
os.remove(O + ".fc.txt")
