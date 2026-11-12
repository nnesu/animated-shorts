# Flags framing / staging defects from the QADUMP scene-geometry log (src/shared/qadump.ts). Scripted, no model.
# Input: <prefix>qadump.jsonl from bridge-stills.mjs (one QaFrame JSON per line, "QADUMP " prefix optional) or a JSON list.
# Per frame (subject = the on-screen card with the largest screen height; cards < 10 % in frame are ignored):
#   subject < 90 % inside the frame | a card cut 10-90 % by the frame edge | a card < 1.8 m from the lens |
#   feet floating > 0.05 m above the ground under them | side-profile drawing | no card >= 1.5x the next card's screen
#   height (no clear subject), unless the frame is crowdOk or its shot id is in --crowd-ok.
# Usage: python scripts/qa_geometry.py <qadump.jsonl|json> [--crowd-ok 3,5]   -> prints flags, exit 1 if any
import json, sys
import numpy as np

args = sys.argv[1:]
crowd = set()
if "--crowd-ok" in args:
    k = args.index("--crowd-ok"); crowd = {int(s) for s in args[k + 1].split(",") if s}; del args[k:k + 2]
txt = open(args[0], encoding="utf-8").read().strip()
frames = json.loads(txt) if txt.startswith("[") else [json.loads(l.split("QADUMP ", 1)[-1]) for l in txt.splitlines() if l.strip()]
frames = list({(fr["id"], fr["f"]): fr for fr in frames}.values())  # a frame can be posed (and logged) twice: keep the last


nm = lambda c: c["key"].split("|{")[0]  # drawing key without its options


def flags(fr):
    cards, out = [c for c in fr["cards"] if c["inFrame"] >= 0.1], []  # < 10 % in frame: posed but not seen, ignored
    if not cards:
        return out
    h = np.array([c["hPx"] for c in cards], float)
    order = np.argsort(-h)
    subj = cards[order[0]]
    if subj["inFrame"] < 0.9:
        out.append(f"subject {nm(subj)} only {subj['inFrame']:.0%} in frame")
    for c in cards:
        if c is not subj and 0.1 <= c["inFrame"] <= 0.9:
            out.append(f"{nm(c)} cut by the frame edge ({c['inFrame']:.0%} in)")
        if c["dist"] < 1.8:
            out.append(f"{nm(c)} {c['dist']} m from the lens (< 1.8)")
        if c.get("groundY") is not None and c["baseY"] - c["groundY"] > 0.05:
            out.append(f"{nm(c)} floats {c['baseY'] - c['groundY']:.2f} m above the ground")
        if c.get("side"):
            out.append(f"{nm(c)} drawn as side profile")
    if len(cards) > 1 and h[order[0]] < 1.5 * h[order[1]] and not fr.get("crowdOk") and fr["id"] not in crowd:
        out.append(f"no clear subject: tallest {h[order[0]]:.0f} px vs next {h[order[1]]:.0f} px (< 1.5x; tag crowd-ok if intended)")
    return out


bad = 0
for fr in frames:
    fl = flags(fr)
    bad += bool(fl)
    print(f"shot {fr['id']} f{fr['f']}: {len(fr['cards'])} cards, " + ("OK" if not fl else "FLAG\n  - " + "\n  - ".join(fl)))
print(f"{bad} of {len(frames)} frames flagged")
sys.exit(1 if bad else 0)
