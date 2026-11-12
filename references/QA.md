# QA

Three layers: scripts, one model call, the user. No 0-10 score is ever a gate.

## 1. Stills check (before any long render; repeat for changed shots only)

Frames: the mid frame of every shot. Never a crossfade frame (the double exposure gets flagged as broken).
```
python scripts/bridge_shots.py src/videos/<name>/story.ts out/<name>/shots.json
python -c "import json;print(','.join(str((s['a']+s['b'])//2) for s in json.load(open('out/<name>/shots.json'))['shots']))"
PROPS='{"post":{"qaDump":true}}' REMOTION_TMP=C:/remotion-tmp COMP=<Comp> node scripts/bridge-stills.mjs out/<name>/qa_ <frames> 0.5
```
This writes `out/<name>/qa_<frame>.jpg` (540x960) and the geometry log `out/<name>/qa_qadump.jsonl`. The log hooks are built into the engine. `COMP` defaults to `BridgeShort`, so always set it.

### Scripts
- `python scripts/qa_stills.py out/<name>/qa_*.jpg [--flat-pct N] [--dark-ok]` flags black holes, magenta placeholders and large flat regions. Set `--flat-pct` just above the highest value on this video's good frames (default 35; slinky's DOF macro shots needed 62).
- `python scripts/qa_geometry.py out/<name>/qa_qadump.jsonl [--crowd-ok <shot ids>]` flags: subject under 90 % in frame, a card cut 10-90 % by the edge, a card under 0.9 m from the lens, feet floating over 0.05 m, side-profile drawings, no card at least 1.5x the next one's screen height. The box is the whole card quad, so in-frame fractions run low.
- `grep -nE "if \((f|t) ?[<>]=? ?[0-9]" src/videos/<name>/cast.ts` lists simple time conditions (not ones on a variable, ternaries or `f` after `&&`: scan those by eye). One that guards an `add(` makes a character appear or vanish mid-shot: keep it only if the script calls for it or it sits on a hard cut.

### Checklist: who checks when
An agent call costs about 70k tokens whatever the number of stills; checking a still yourself costs about 700. So the agent is used twice, at the two points where fresh eyes matter most, and never in an open loop (it flags about 2 in 10 good frames, so it never comes back fully clean).
1. **Agent check 1, on the first full set.** One agent, `model: opus`, `effort: medium` (Sonnet is the cheaper fallback; it missed 1 of 6 planted defects). Every still in one call, never one call per frame. Always include the frames the scripts flagged.
2. **Fix, then self-check the changed shots.** Re-render those stills, run both scripts again, open each still next to its previous version and go through all 14 items, not only the one that was flagged (a fix often breaks something else in the shot). Say per still what was flagged and what you now see.
3. **Agent check 2, on the full set, once you think it is ready to render.** Skip it only if nothing changed since check 1.
4. **Fix, then self-check** as in 2. No third agent call, unless more than a third of the shots changed or a set or camera was rebuilt.
5. **User gate. Stop here.** Show the user the final still of every shot and wait for a clear yes before the final render. If the user rejects anything: fix it, then start again at 3 (agent check on the full set, fix, self-check, back to the user).

Prompt (agent and self-check use the same items):
```
These are mid-shot stills (540x960) of a vertical cartoon short: flat 2D cartoon characters in a painted 3D world, with
depth-of-field blur on purpose. Open every file at full size. For each frame answer yes/no for each item. Reply with JSON
only: [{"frame": "<file>", "flags": [{"item": <n>, "what": "<what and where, under 15 words>"}]}], empty flags = clean.
Flag only what a viewer would notice as a mistake. Normal, never flag: background scenery running off the frame, plain
painted walls, sky, blurred backgrounds.
1 missing or smeared mouth  2 a main character's face sliced by an object or the frame edge
3 the subject or a foreground object cut awkwardly by the frame edge
4 floating or pasted object  5 objects passing through each other  6 no clear subject  7 large region that looks unfinished
8 black hole  9 missing or placeholder texture  10 otherwise broken
11 bare horizon (sky meets ground or water with nothing on it)  12 set piece missing or misplaced (in water, inside
another object)  13 props passing through each other  14 character or prop not touching what it stands or sits on
Frames: <paths>
```
Review each flag once yourself. It is a false alarm only if the flagged thing is not there.

Tested on 16 stills (one run): 6 of 6 planted defects found; 2 of 10 good frames flagged, a crossfade frame and a real framing flaw; no flag on 4 covered horizons. Bare horizon, second run on 8 slinky stills: 6 of 6 bare frames flagged, 0 of 2 covered ones (0 of 6 over both runs). The "normal, never flag" line matters: without it 8 of 10 good frames were flagged.

## 2. After the final render
`python scripts/short_qa.py out/<name>/video_final.mp4 out/<name>/qa out/<name>/shots.json --voice _voiceover/<name>/voice.wav` must exit 0. It fails on: audio vs video length or length vs the voice off by more than 1 frame, frame count not round(duration x fps), black / unplanned white / frozen spans, loudness outside -15 LUFS +-1, true peak over -1 dBFS. Planned flashes and crossfades come from `shots.json` (`{"shots":[{"id":1,"a":0,"b":130}],"flash":[a,b],"xfade":[[a,b]]}`). Pillow is not installed, so its contact sheets are skipped.

Usual failures: a flat hold reads as a freeze (12 frames or more: add a creeping push-in); a loop that resets mid-shot reads as a pop (give it an explicit switch time).

## 3. User review
The user watches and listens once. For notes tied to a frame the user runs `node scripts/review.mjs <name>` and comments in the page (`http://127.0.0.1:5177`). When the user says "read comments": `node scripts/review.mjs <name> --dump` prints one line per open note (`s<shot> f<frame> [tag] <id> <text>`) and the `--redo` ranges. Do not read `out/<name>/comments.json`. After the fixed video is delivered: `node scripts/review.mjs <name> --resolve <ids>`. Never delete or reword a note. The player needs a video with exactly `TOTAL` frames: never cut frames out of a final after the render.

## Look changes only
Changing the look itself (ink, grade, DOF, lighting) is judged by pairwise A/B on 6 fixed frames: `house/GRADER_PROMPT.md`. Sandbox renders for that: `LOOK.md` "Look-match loop".
