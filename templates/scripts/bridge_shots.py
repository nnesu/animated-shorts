# usage: python scripts/bridge_shots.py src/videos/<name>/story.ts out/<name>/shots.json
# Writes shots.json (shot frame ranges, crossfade windows, flash) from story.ts for scripts/short_qa.py.
# A timemap.json next to story.ts (voice_gaps.py retime) maps every frame from authored to new time, as camkit retime() does.
import json, math, os, re, sys
story = sys.argv[1] if len(sys.argv) > 1 else "src/videos/bridge/story.ts"
src = open(story, encoding="utf-8").read()
consts = {k: float(v) for k, v in re.findall(r"\b([A-Z]\w*) = (\d+(?:\.\d+)?)\b", src)}
tm = os.path.join(os.path.dirname(story), "timemap.json")
if os.path.exists(tm) and "timemap.json" in src:
    KN = json.load(open(tm))
    K = [[0, 0]]
    for i in range(1, len(KN) - 1, 2): K += [[KN[i][0] - 0.1, KN[i][1] - 0.1], [KN[i + 1][0] + 0.1, KN[i][1] + 0.1]]
    K.append(KN[-1])
    def new_f(f):  # authored frame -> new frame (camkit retime NEWs)
        s, i = f / 30, 0
        while i < len(K) - 2 and s > K[i + 1][0]: i += 1
        a, b = K[i], K[i + 1]
        return round((a[1] + (b[1] - a[1]) * (s - a[0]) / ((b[0] - a[0]) or 1)) * 30)
    total = math.ceil(KN[-1][1] * 30)
else:
    new_f = lambda f: f
    total = int(re.search(r"TOTAL = (\d+)", src).group(1))
endf = lambda b: total if b == "TOTAL" or (b.startswith("TOTAL") and b in consts and new_f(consts[b]) >= total - 1) else new_f(int(consts.get(b, b)))
shots = [{"id": int(i), "a": new_f(int(a)), "b": endf(b)}
         for i, a, b in re.findall(r"(?:\{ id: |\bsh\()(\d+), (?:a: )?(\d+), (?:b: )?(\w+)[,)]", src)]
# fail loud on entries the regexes cannot read (e.g. `467 / 30`): they were silently mis-parsed before
if len(shots) != len(re.findall(r"^\s*(?:\{ \.\.\.)?(?:sh\(|\{ id: \d)", src, re.M)): sys.exit("story.ts: every sh(id, a, b, ...) needs numeric literals for id, a, b (b may be TOTAL)")
xf = {int(k): int(v) for k, v in re.findall(r"(\d+): (\d+)", re.search(r"XFADE[^=]*= \{([^}]*)\}", src).group(1))}
flash = new_f(int(re.search(r"FLASH_AT = (\d+)", src).group(1)))
xfade = [[s["a"] - xf[s["id"]] // 2, s["a"] + xf[s["id"]] // 2] for s in shots if s["id"] in xf]
# planned hard cuts inside shots, and 7-frame flip kicks (SNAP / DROP1 / hammer blows)
cuts = [[new_f(int(consts.get(f, f)))] * 2 for f in re.findall(r"\{ f: (\w+), cut: true", src)]
kicks = []
m = re.search(r"const KICKS[^=]*= \[(.*?)\];", src)
if m:
    ks = re.findall(r"\[([\w.]+)( / (?:FPS|30))?, ([\d.]+)\]", m.group(1))  # seconds, CONST, or frame / FPS
    if len(ks) != len(re.findall(r"\[[^\[\]]*\]", m.group(1))): sys.exit("story.ts: KICKS entries must be [seconds | CONST | frame / FPS, strength]")
    for t0, per, _ in ks:
        f0 = new_f(int(t0) if per else round((consts[t0] if t0 in consts else float(t0)) * 30))
        kicks.append([f0, f0 + 8])
json.dump({"fps": 30, "total": total, "shots": shots, "xfade": xfade, "flash": [flash, flash + 4], "planned": cuts + kicks}, open(sys.argv[2] if len(sys.argv) > 2 else "out/bridge/shots.json", "w"), indent=1)
print(len(shots), "shots", xfade, flash, "cuts", [c[0] for c in cuts], "kicks", kicks)
