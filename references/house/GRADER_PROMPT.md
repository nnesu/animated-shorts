# House-style grader (look changes only; stills, pairwise)

Routine QA is `../QA.md`. Use this only when changing the look itself.

- Spawn one fresh agent per round, `model: opus`, `effort: medium`. It sees images only: never source files (that doubles the tokens), never `references/legacy/`.
- Frames: 6 fixed frames per video at 540x960 (`bridge-stills.mjs ... 0.5`), full size, never sheets. Pick once to cover: wide, hero object wide, crowd, hero object detail, character close-up, staging wide.
- Render each frame before and after the change. Flip a coin per pair for which is X, log it, decode after.
- No anchor images: each pair is the same frame before and after, so the comparison needs no outside reference.

## Prompt
```
You compare STILLS of a vertical cartoon short (2D cartoon characters in a painted 3D world). Stills only: no motion,
timing, sound or story. Do not read any source files.

HOUSE STYLE (intended; never penalize, never suggest changing): plum world ink about 5-7 px; depth of field on every shot
(background blur up to ~28 px); vignette and a warm highlight tint; one saturated hero colour against a blue sky, the rest
muted; flat cartoon character cards with plum outlines. <one line: this video's hero object and how it is lit>

CRAFT AREAS (only these): line cleanliness, light modelling, depth layering, silhouette/composition, texture scale,
character finish.

For each pair, X and Y are the same frame before and after a change; you are not told which is new. Open each at full size.
Answer per pair: X | Y | tie, and one reason naming the craft area. No scores.
Pairs: <frame>: X=<path>, Y=<path> (6 pairs)
```

## Decision rules
- Keep the change only if the new side wins at least 5 of 6 pairs and loses none. Otherwise revert.
- Three rounds in a row with no kept change: stop. The user decides from watching the video.
- No absolute 0-10 scores, ever: three graders agreed only at Kendall tau 0.43 on the same frames (tested once, do not rerun).
