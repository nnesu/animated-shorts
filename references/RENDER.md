# Rendering

## Final render
```
REMOTION_TMP=C:/remotion-tmp node scripts/render_chunks.mjs <Comp> out/<name>/video.mp4 <TOTAL> [chunk=300]
```
- Renders 1080x1920 in chunks, skips finished chunks, retries each 3 times, deletes the bundle folder each chunk leaves in `REMOTION_TMP`, joins with ffmpeg. It refuses to run without `REMOTION_TMP`.
- Before starting: ask for keep-awake (`request_keep_awake`, `until: session_idle`) and time a 12-frame range that crosses a shot change (crossfade frames render two scenes and are the slow ones).
- Run it as a background command. After a crash, sleep or closed terminal, run the same command again and it resumes. Never start a second copy: a stopped task can leave node/chrome processes alive, so read the log first.
- Speed: about 1 s per frame at 1080p with one tab (the script's setting; two tabs are slower per frame, Remotion's default is far slower).
- Check the joined file is exactly TOTAL / 30 seconds.

## Patch loop
```
REMOTION_TMP=C:/remotion-tmp node scripts/render_chunks.mjs <Comp> out/<name>/video.mp4 <TOTAL> [chunk] --redo A-B,C-D
```
Re-renders only the chunks overlapping those frame ranges and re-joins (2-3 minutes instead of about 40). Use the same chunk size as the first render and include both crossfades of a changed shot. Then mix and `short_qa.py` again.

## Keeping the skill copy in sync
After changing anything in `scripts/` or `src/shared/`: `node scripts/skill_sync.mjs` compares them with `templates/` and prints the `cp` lines (exit 1 on a mismatch).
