# Rendering

Read at the final render, for patch renders after review notes, and when a render shows white frames or stops.

## Final render
```
REMOTION_TMP=C:/remotion-tmp node scripts/render_chunks.mjs <Comp> out/<name>/video.mp4 <TOTAL> [chunk=150]
powershell -NoProfile -File scripts/memguard.ps1            # background, next to every render (memory below)
python scripts/film_finish.py out/<name>/video.mp4 out/<name>/video_film.mp4 --story src/videos/<name>/story.ts
```
`film_finish.py` (golden-hour "shader" finish + whip-pan blur at `WHIPS`) runs on every final, before the mix; the mix then takes `video_film.mp4` as its video. Voice only: `ffmpeg -i video_film.mp4 -i <voice.wav> -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest video_final.mp4`.
- Renders 1080x1920 in chunks, skips finished chunks, retries each 3 times, deletes the bundle folder each chunk leaves in `REMOTION_TMP`, joins with ffmpeg. It refuses to run without `REMOTION_TMP`, and on chunks from another timeline (`<chunks>/meta.json` holds total and chunk size): delete that folder after a re-time.
- Before starting: ask for keep-awake (`request_keep_awake`, `until: session_idle`) and time a 12-frame range that crosses a shot change (crossfade frames render two scenes and are the slow ones).
- Run it as a background command. After a crash, sleep or closed terminal, run the same command again and it resumes. Never start a second copy: a stopped task can leave node/chrome processes alive, so read the log first. To stop a stray render on Windows use PowerShell `Stop-Process` on its node and chrome child processes; `pkill` misses the process tree.
- Speed: about 1.4 s per frame at 1080p with one tab, 150-frame chunks about 3.5 min (the script's setting; two tabs are slower per frame, Remotion's default is far slower).

## Memory (this laptop: 7.4 GB RAM, the iGPU shares it)
- A render Chrome needs about 3.5-4 GB. It used to reach 5-7 GB and freeze Claude: every shot built all zones, the old shot's world was never freed, textures were 2048 px. The engine now frees the old shot's world and caps textures at 1024 px; multi-zone shorts build only the zones each shot sees (`API.md` "Zones").
- `memguard.ps1` kills a render Chrome above 5.5 GB (a runaway) and logs each new peak with its time. Never guard on low free RAM: normal renders page a little.
- After a freeze or a killed session: kill every process whose command line contains `remotion-tmp` (orphan renderers keep their memory), then resume the same render command. Startup apps (games, browsers, chat apps) reopen after a reboot: close them before long renders.
- Check the joined file is exactly TOTAL / 30 seconds.

## Patch loop
```
REMOTION_TMP=C:/remotion-tmp node scripts/render_chunks.mjs <Comp> out/<name>/video.mp4 <TOTAL> [chunk] --redo A-B,C-D
```
Re-renders only the chunks overlapping those frame ranges and re-joins (2-3 minutes instead of about 40). Same `TOTAL` without `--redo` reuses every finished chunk: after a code change delete the chunks that cover changed frames (or the whole `video_chunks` folder). Use the same chunk size as the first render and include both crossfades of a changed shot. Then mix and `short_qa.py` again, then reopen the review player (`QA.md` "User review").

Which shots a code change altered: re-render the mid-shot stills to a new prefix (the `QA.md` stills command with `out/<name>/new_`), then `python scripts/stills_diff.py out/<name>/shots.json out/<name>/qa_ out/<name>/new_`. It prints the changed shots and the `--redo` ranges, and catches clear side effects (a new hard shadow); a faint change can print `same`, so view the stills of the shots you expect to change. It sees only the mid frame: add by hand a shot that changed only at another time. Once the patch is approved, move the new stills over the old ones: `for f in out/<name>/new_*.jpg; do mv "$f" "${f/new_/qa_}"; done` (Bash).

Picture-only fix (no timing or sound change): keep the old mix. `cp out/<name>/video_final.mp4 out/<name>/prev.mp4` (ffmpeg cannot read and write one file; the old final must have `TOTAL` frames), then `ffmpeg -y -i out/<name>/video.mp4 -i out/<name>/prev.mp4 -map 0:v:0 -map 1:a:0 -c copy out/<name>/video_final.mp4`, then `short_qa.py`.

## Drafts and white frames
- Revision renders: add `--draft` (half size, for the review player only). Only about 6 % faster; never mix draft and 1080p chunks in one video.
- WebGL can lose state mid-chunk (out of memory, `GL_OUT_OF_MEMORY` in the log) and render white frames from there on. `short_qa.py` fails on them (centre crop). Re-render those chunks after fixing memory. Fix: `sh scripts/splice_redo.sh <Comp> <chunk dir> <chunk index> <chunk size> <a> <b> [--draft]` (re-renders from the first white frame and splices onto the chunk), then restitch with `ffmpeg -f concat -safe 0 -i <chunk dir>/list.txt -vf "setpts=N/30/TB" -fps_mode passthrough -c:v libx264 -crf 16 -pix_fmt yuv420p <out>` (`-r 30` duplicates a frame).
