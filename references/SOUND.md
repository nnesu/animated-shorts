# Sound

Read at sound prep and the mix (after the picture's timing is locked). House audio: narration pauses about 0.2 s (`voice_trim.py` defaults), CC0 SFX first, scene music cues ducked under the voice, whole mix -15 LUFS.

`A` = `.claude/skills/cartoon-3d-short/templates/audio`. Lock the picture's timing before making sound: any later timing change means re-running the mix.

## Sound effects: free libraries first
- Use free, no-copyright libraries (standing download approval). Generating an effect is the last resort.
- Keep downloads in `sfx/raw/<source>/` and log source page, licence and size per pack in `sfx/LICENSES.md`.
- Libraries that worked:
  - Kenney Impact Sounds and RPG Audio (CC0). A pack without a download button: in the browser pane on kenney.nl run `fetch("https://kenney.nl/download-link/" + hex("assets/<slug>"))` (hex = each character as 2 hex digits); curl the signed `.url` it returns with a browser User-Agent.
  - OpenGameArt CC0 packs (mud, metal/wood, water/splash/slime, swishes, thwack, balloon, seagulls, ocean waves, dripping loop, crowd shouting, applause) at `opengameart.org/sites/default/files/<file>`. The page shows the licence. Search filters: CC0 `field_art_licenses_tid[]=4`, SFX `field_art_type_tid[]=13`. WebFetch gets 403: use the browser pane.
  - Mixkit is free for commercial use, but its file links cannot be scraped.
- Events file `sfx/<name>_events.json`: `[[time s, file, gain dB, trim s|null, fade-out s|null], ...]`, files relative to `sfx/`, timed to `words.json` and the story kicks.

## Music: one short cue per scene
- Never one track under the whole short. Each cue fits what is on screen (mood, tempo, instrument) and starts and ends with its scene. Silence between cues is intended. The music stops for the snap and the reveal.
- Source: quick library check first (Kenney Music Jingles, OpenGameArt CC0 music; skip anything needing attribution). If nothing fits the mood and length, generate: copy `A/music_example.py` (numpy only, one function per cue, writes the cue wavs and the cues json). Log the source or "generated" per cue in `sfx/LICENSES.md`.
- Cue craft: one mood, quiet, no lead melody over speech; 4-15 s; start on a cut or a word; fades 0.3-1 s; before the snap a hard stop (fade 0.05-0.15 s) about 0.2 s early; cues that join overlap 0.5 s in the same key and tempo. Gains are relative: `build_mix.py` sets the level.
- Cues file `sfx/<name>_music_cues.json`: `[[start s, file, gain dB, length s|null, fade-in s, fade-out s], ...]`, files relative to the json.

## Mix (after the final render: both scripts read the video's length)
```
python A/music_cues.py out/<name>/video.mp4 sfx/<name>_music_cues.json sfx/<name>_music.wav
python A/build_mix.py voiceover/<name>/voice.wav out/<name>/video.mp4 out/<name> sfx/<name>_events.json [sfx/<name>_music.wav]
```
`build_mix.py` (ffmpeg only) writes `out/<name>/mix.wav` and `video_final.mp4` (video stream copied). It puts all effects 6 dB under the voice (to change that for one video, add one constant to every gain in the script that writes `sfx/<name>_events.json`; "20 % quieter" is 20·log10(0.8) = -1.94 dB; the mix is then normalised, so voice and music get relatively louder), levels the music 11 dB under the voice and sidechain-ducks it further while the voice speaks (listen to `music_ducked.wav`), then applies one measured gain to -15 LUFS and a limiter. It refuses a music wav that is not exactly the video length.

Do not reuse `sfx/build_mix.py`: it is the molasses-only original with its events inline.
