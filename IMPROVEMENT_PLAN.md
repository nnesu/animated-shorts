# IMPROVEMENT PLAN v2 (status: IMPLEMENTED 2026-11-13 except QA checklist prompt item 15 + narration lines: prompt change needs a re-test per MAINTAINING "Doc change")
audience: AI agent. SK = .claude/skills/cartoon-3d-short. Inputs: src/videos/basketball/POSTMORTEM.md; 2 Fable consults (postmortem gap analysis, lean review); main-agent checks against script sources.
Before implementing: read SK/MAINTAINING.md. End: mirror scripts/ + src/shared/ into SK/templates/, `node scripts/skill_sync.mjs` exit 0 (once).

## Order
1. Wake test (gates Part B), started in the same turn as the step-2 question (both idle waits): main session runs Bash run_in_background `node -e "setTimeout(()=>console.log('woke'),30*60e3)"` (keep > 10 min), goes idle; pass = harness re-invokes the session on exit. Fail -> retry with Monitor; both fail -> drop Part B, keep "read comments".
2. User yes on approval rule (B4). Then update memory qa-model-opus-default.md + SKILL.md:21 to match.
3. A1, A2, A3 (scripts).
4. One docs pass: A4.
5. Part B code (B1-B3), then docs (B4-B5).
6. skill_sync once.

## Part A: postmortem fixes
A1 scripts/voice_trim.py: defaults MAX_PAUSE 0.5->0.25, KEEP 0.35->0.16 (lines 21-24, usage line 7); kept inner gaps >= 0.3 s (line 68, now print-only) cut to KEEP. No opt-out flag. --tight unchanged (still cuts shorter in-phrase gaps to 0.1 s). Evidence: v2 basketball used the same cuts via --tight (0.1 s) and was approved; 15 ms crossfade, no clicks reported. GOTCHAS Voice lines 9, 11: new defaults; --tight stays for in-phrase gaps.
A2 scripts/render_chunks.mjs: write `<chunk dir>/meta.json` {total, chunk}; on start: missing meta.json -> write it, continue; mismatch -> exit 1 "chunks from another timeline: delete <dir>". (Basketball retime changed TOTAL 2397->2180: this catches it. Same-TOTAL retime ignored.) RENDER.md line 7: one line.
A3 scripts/bridge_shots.py: exit 1 if KICKS / FLASH_AT / sh(...) / `{ f:` hold non-literals. API.md:19 append "numeric literals only". scripts/qa_geometry.py:35-36 near-lens 0.9 -> 1.8 m (GOTCHAS:32 says 2 m; approved close-ups sit 2-2.8 m).
A4 docs (one pass):
- GOTCHAS "Framing and readability": "A prop the narration names is in frame with the character; a shot introducing a prop shows where it sits (prop centred, surroundings visible)." + "9:16: horizontal half-width = d*tan(vfov/2)*0.5625 (about 0.23 m per metre at fov 44): budget side-by-side subjects and held props against it."
- GOTCHAS "Props and sets": "A hung or wall-mounted prop needs a visible mount (bracket, plank, rope)."
- QA.md checklist prompt: Frames list carries each still's narration line (`qa_<f>.jpg: "<line>"`, from words.json over the shot span: extend the QA.md frames one-liner); item 15 "a thing the line names is not visible".
- SKILL.md step 12: "Delete out/<name>/video.mp4 and video_chunks only after the user approves the final."
Cut: culled-object report (A7 old), per-cue music print (A9 old). Rejected one-offs: E04 E07 E08 E10 E11 E12, R04 post rule, permanent bb_timemap.py.

## Part B: review loop (auto-open player + Submit)
B1 scripts/review.mjs:
- POST /api/submit (behind hostOk, line 106; before line 122): write out/<name>/submit.json {at}.
- `--wait-submit` (CLI lines 146-152, usage + header lines 1-6): poll-only, binds no port; poll submit.json every 2 s; on find: unlink, print `submit: approved` if zero open notes else `submit: N notes` + dump(name); exit 0.
- selftest (pure takeSubmit-style function, no timers): submit absent -> keep waiting; present + notes -> dump; present + zero open -> approved.
B2 scripts/review.html line 47: <button id="submit"> label from draw(): `Submit N notes` | `Approve`; click -> disable button, POST, show `Submitted HH:MM` (prevents a second submit.json after the waiter unlinks the first = false `approved`). No confirm() (native dialogs unverified in the browser pane).
B3 .claude/launch.json: one `review` entry; agent rewrites runtimeArgs name before preview_start.
B4 approval rule (needs user yes): first final render keeps the stills gate; Submit = go-ahead for patch fixes; a fix that changes TOTAL -> stills gate first.
B5 docs:
- QA.md "## 3. User review": after short_qa exit 0 the MAIN session (never a subagent: wake goes nowhere) does preview_stop any review server, rewrite launch name, preview_start, then Bash run_in_background `node scripts/review.mjs <name> --wait-submit` (one per short). On wake: preview_stop the review server FIRST (no Submit while fixing), then read waiter output (never comments.json); classify tag (look/other -> printed --redo; audio -> events/cues + build_mix.py; timing -> re-time + stills gate); fix; stills of noted frames + self-check; render_chunks --redo; mix or picture-only mux; bridge_shots.py + short_qa.py; --resolve fixed ids; restart player + waiter; one line to user. `submit: approved` -> Deliver (step 12 cleanup).
- SKILL.md line 38: "Then open the review player and wait: `references/QA.md` \"User review\"." Keep size ~7 KB (wc -c).
- RENDER.md Patch loop line 17: "then reopen the review player (QA.md)".
- MAINTAINING.md: Stills QA line + submit.json, after user yes. grep `read comments` in SK (README.md). cp review.mjs, review.html -> templates/scripts/.

## Tests
- A1: re-trim basketball raw into scratch with new defaults; expect ~72.6 s and empty kept list; listen once.
- A2: render_chunks with a meta.json of another TOTAL -> exit 1.
- A3: bridge_shots on a story with `467 / 30` in KICKS -> exit 1; qa_geometry on out/basketball/qa_qadump.jsonl at 1.8 m -> no new near-lens flags on approved close-ups.
- B: --selftest; manual: note + Submit -> waiter prints dump; Submit with zero notes -> approved; end-to-end wake in the app (needs a short with video_final.mp4: use `--video out/basketball/video_final.mp4`).

## Review status
3 Fable consults; last verdict: diminishing returns, implement and fix from the real run.

## Risks
- Part B rests on step 1 wake test.
- App close kills the waiter: on resume rerun --wait-submit (submit.json persists, fires at once).
- Mis-click Submit starts work (no confirm).
