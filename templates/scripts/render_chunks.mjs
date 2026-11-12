// Resumable, self-retrying Remotion render: renders in frame chunks, skips chunks that already exist, retries failed ones,
// then joins them with ffmpeg (stream copy, no re-encode). Safe to re-run after a crash, a sleep or a closed terminal.
// usage: REMOTION_TMP=<big drive>/remotion-tmp node scripts/render_chunks.mjs <CompositionId> <out.mp4> <totalFrames> [chunk=300] [--redo A-B,C-D]
// --redo: patch loop after a fix: deletes only the chunks overlapping those frames, re-renders them and re-joins (minutes, not a full render).
// Keep the same chunk size as the first render. Then re-run build_mix.py and short_qa.py.
// Renders at the composition's native size (1080x1920, no --scale). Deletes the bundle folders each chunk adds to REMOTION_TMP.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2), ri = argv.indexOf("--redo");
const redo = ri < 0 ? [] : argv.splice(ri, 2)[1].split(",").map((r) => r.split("-").map(Number));
const [comp, out, totalArg, chunkArg = "300"] = argv;
if (!comp || !out || !totalArg) { console.error("usage: REMOTION_TMP=<big drive>/remotion-tmp node scripts/render_chunks.mjs <Comp> <out.mp4> <totalFrames> [chunk=300]"); process.exit(2); }
if (!process.env.REMOTION_TMP) { console.error("set REMOTION_TMP to a folder on a big drive (each chunk's bundle copies public/, ~1.3 GB)"); process.exit(2); }
const total = Number(totalArg), chunk = Number(chunkArg);
const dir = out.replace(/\.mp4$/i, "") + "_chunks";
fs.mkdirSync(dir, { recursive: true });
// chunks from another timeline (re-timed voice, other chunk size) would be reused silently: they pass the frame-count test
const metaF = path.join(dir, "meta.json"), meta = fs.existsSync(metaF) ? JSON.parse(fs.readFileSync(metaF, "utf8")) : null;
if (meta && (meta.total !== total || meta.chunk !== chunk)) { console.error(`chunks from another timeline (total ${meta.total}, chunk ${meta.chunk}): delete ${dir}`); process.exit(1); }
if (!meta) fs.writeFileSync(metaF, JSON.stringify({ total, chunk }));
const tmp = path.resolve(process.env.REMOTION_TMP);
fs.mkdirSync(tmp, { recursive: true });
const env = { ...process.env, TEMP: tmp, TMP: tmp };
const chrome = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
// npx is a .cmd on Windows, so it needs a shell (Node refuses .cmd without one); the shell splits on spaces, so quote
const q = (a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const bundles = () => new Set(fs.readdirSync(tmp).filter((d) => d.startsWith("remotion-webpack-bundle-")));

/** a chunk counts as done only if ffprobe reads the expected frame count */
const frames = (f) => {
  if (!fs.existsSync(f) || fs.statSync(f).size < 1000) return -1;
  const r = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", f], { encoding: "utf8" });
  return parseInt((r.stdout || "").trim(), 10) || -1; // ffprobe may print a trailing comma ("30,")
};

const parts = [];
for (let a = 0, i = 0; a < total; a += chunk, i++) {
  const b = Math.min(total - 1, a + chunk - 1), want = b - a + 1, f = path.join(dir, `chunk_${String(i).padStart(3, "0")}.mp4`);
  parts.push(f);
  if (redo.some(([x, y]) => x <= b && (y ?? x) >= a)) { fs.rmSync(f, { force: true }); console.log(`chunk ${i} (${a}-${b}) redo`); }
  if (frames(f) === want) { console.log(`chunk ${i} (${a}-${b}) already done`); continue; }
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    console.log(`chunk ${i} (${a}-${b}) attempt ${attempt}`);
    fs.rmSync(f, { force: true });
    const before = bundles();
    const r = spawnSync("npx", ["remotion", "render", "src/index.ts", comp, f, "--codec", "h264", "--crf", "16", `--frames=${a}-${b}`, "--concurrency=1",
      "--browser-executable", chrome, "--gl=angle", "--timeout", "180000", "--log=error"].map(q), { env, shell: true, stdio: "inherit" });
    for (const d of bundles()) if (!before.has(d)) fs.rmSync(path.join(tmp, d), { recursive: true, force: true }); // only the bundle this chunk made
    ok = r.status === 0 && frames(f) === want;
    if (!ok) console.log(`chunk ${i} failed (exit ${r.status}), retrying`);
  }
  if (!ok) { console.error(`chunk ${i} failed 3 times: re-run this command to resume from here`); process.exit(1); }
}
const list = path.join(dir, "list.txt");
// each chunk carries Remotion's silent AAC track, ~0.05 s longer than its video: without an explicit duration the concat
// demuxer starts every next chunk that much late (75.84 s instead of 75.50 s over 8 chunks, picture drifting off the voice)
const FPS = Number(process.env.FPS || 30);
fs.writeFileSync(list, parts.map((p, i) => `file '${path.resolve(p).replace(/\\/g, "/")}'\nduration ${(Math.min(chunk, total - i * chunk) / FPS).toFixed(6)}`).join("\n"));
const j = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-map", "0:v", "-c", "copy", out], { stdio: "inherit" });
if (j.status !== 0) { console.error("join failed"); process.exit(1); }
console.log(`done: ${out} (${frames(out)} frames)`);
