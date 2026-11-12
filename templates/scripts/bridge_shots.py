# usage: python scripts/bridge_shots.py src/videos/<name>/story.ts out/<name>/shots.json
# Writes shots.json (shot frame ranges, crossfade windows, flash) from story.ts for scripts/short_qa.py.
import json, re, sys
src = open(sys.argv[1] if len(sys.argv) > 1 else "src/videos/bridge/story.ts", encoding="utf-8").read()
shots = [{"id": int(i), "a": int(a), "b": int(b) if b != "TOTAL" else int(re.search(r"TOTAL = (\d+)", src).group(1))}
         for i, a, b in re.findall(r"(?:\{ id: |\bsh\()(\d+), (?:a: )?(\d+), (?:b: )?(\w+)[,)]", src)]
# fail loud on entries the regexes cannot read (e.g. `467 / 30`): they were silently mis-parsed before
if len(shots) != len(re.findall(r"^\s*(?:sh\(|\{ id: \d)", src, re.M)): sys.exit("story.ts: every sh(id, a, b, ...) needs numeric literals for id, a, b (b may be TOTAL)")
xf = {int(k): int(v) for k, v in re.findall(r"(\d+): (\d+)", re.search(r"XFADE[^=]*= \{([^}]*)\}", src).group(1))}
flash = int(re.search(r"FLASH_AT = (\d+)", src).group(1))
xfade = [[s["a"] - xf[s["id"]] // 2, s["a"] + xf[s["id"]] // 2] for s in shots if s["id"] in xf]
# planned hard cuts inside shots, and 7-frame flip kicks (SNAP / DROP1 / hammer blows)
cuts = [[int(f), int(f)] for f in re.findall(r"\{ f: (\d+), cut: true", src)]
consts = {k: float(v) for k, v in re.findall(r"\b([A-Z]\w*) = (\d+(?:\.\d+)?)\b", src)}
kicks = []
m = re.search(r"const KICKS[^=]*= \[(.*?)\];", src)
if m:
    ks = re.findall(r"\[([\w.]+)( / (?:FPS|30))?, ([\d.]+)\]", m.group(1))  # seconds, CONST, or frame / FPS
    if len(ks) != len(re.findall(r"\[[^\[\]]*\]", m.group(1))): sys.exit("story.ts: KICKS entries must be [seconds | CONST | frame / FPS, strength]")
    for t0, per, _ in ks:
        f0 = int(t0) if per else round((consts[t0] if t0 in consts else float(t0)) * 30)
        kicks.append([f0, f0 + 8])
total = int(re.search(r"TOTAL = (\d+)", src).group(1))
json.dump({"fps": 30, "total": total, "shots": shots, "xfade": xfade, "flash": [flash, flash + 4], "planned": cuts + kicks}, open(sys.argv[2] if len(sys.argv) > 2 else "out/bridge/shots.json", "w"), indent=1)
print(len(shots), "shots", xfade, flash, "cuts", [c[0] for c in cuts], "kicks", kicks)
