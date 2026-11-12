// Frame-accurate review player for a finished short: the user comments on frames in the browser, the agent reads them as text.
// usage (from the project root):
//   node scripts/review.mjs <name> [--port 5177] [--video <path>] [--force]   start the player (http://127.0.0.1:<port>)
//   node scripts/review.mjs <name> --dump                                     open notes, one line each, plus --redo ranges
//   node scripts/review.mjs <name> --resolve c_001,c_004                      mark notes resolved
//   node scripts/review.mjs <name> --wait-submit                              block until the user presses Submit, then print the notes (run in background; no port)
//   node scripts/review.mjs --selftest                                        asserts, exit 0 or 1
// Reads out/<name>/shots.json (bridge_shots.py: fps, total, shots, xfade). Notes: out/<name>/comments.json. Node built-ins + ffprobe only.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TAGS = ["look", "audio", "timing", "horizon", "other"];
const HERE = path.dirname(fileURLToPath(import.meta.url));

export const shotOf = (meta, f) => meta.shots.find((s) => s.a <= f && f < s.b);
/** --redo ranges for frames: each frame's shot a..b-1, widened by the crossfades at both ends, merged (same rule as stills_diff.py) */
export const redoRanges = (meta, frames) => {
  const r = [];
  for (const f of frames) {
    const s = shotOf(meta, f);
    if (!s) continue;
    let a = s.a, b = s.b - 1;
    for (const [x0, x1] of meta.xfade || []) { if (x0 <= s.a && s.a <= x1) a = Math.min(a, x0); if (x0 <= s.b && s.b <= x1) b = Math.max(b, x1); }
    r.push([a, b]);
  }
  r.sort((p, q) => p[0] - q[0]);
  const m = [];
  for (const [a, b] of r) { if (m.length && a <= m[m.length - 1][1] + 1) m[m.length - 1][1] = Math.max(m[m.length - 1][1], b); else m.push([a, b]); }
  return m;
};
/** Range header -> null (whole file), [a, b] inclusive, or "416". Browsers send bytes=a- or bytes=a-b only. */
export const parseRange = (h, size) => {
  if (!h) return null;
  const m = /^bytes=(\d+)-(\d*)$/.exec(h);
  if (!m) return "416";
  const a = +m[1], b = m[2] === "" ? size - 1 : Math.min(+m[2], size - 1);
  return a >= size || b < a ? "416" : [a, b];
};
export const newId = (db) => `c_${String(db.next).padStart(3, "0")}`;
/** optional highlight: [x, y, w, h] as fractions of the frame (0-1) */
export const okBox = (b) => b === undefined || (Array.isArray(b) && b.length === 4 && b.every((n) => typeof n === "number" && n >= 0 && n <= 1) && b[0] + b[2] <= 1.001 && b[1] + b[3] <= 1.001);

/** what a Submit means: the agent's wake line */
export const submitLine = (db) => { const n = db.comments.filter((c) => !c.resolved).length; return n ? `submit: ${n} notes` : "submit: approved"; };

const fail = (msg) => { console.error(msg); process.exit(1); };
const files = (name) => { const d = path.join("out", name); return { dir: d, shots: path.join(d, "shots.json"), notes: path.join(d, "comments.json") }; };
const loadMeta = (name) => {
  const p = files(name).shots;
  const m = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  if (!m.fps || !m.total) fail(`run \`python scripts/bridge_shots.py src/videos/${name}/story.ts out/${name}/shots.json\` first (${p} needs fps and total)`);
  return m;
};
const readDb = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : { next: 1, comments: [] });
const writeDb = (p, db) => { fs.writeFileSync(p + ".tmp", JSON.stringify(db, null, 1)); fs.renameSync(p + ".tmp", p); };
const warnStale = (db, meta) => {
  for (const c of db.comments) if (c.total !== meta.total) console.warn(`warning: ${c.id} was made on a ${c.total}-frame video, shots.json now says ${meta.total}: its frame may be wrong`);
};

function selftest() {
  const ok = (c, msg) => { if (!c) { console.error("FAIL", msg); process.exitCode = 1; } };
  for (let f = 0; f < 2400; f++) ok(Math.floor(((f + 0.5) / 30) * 30 + 1e-3) === f, `frame ${f}`); // float arithmetic only, not the browser
  const meta = { fps: 30, total: 240, shots: [{ id: 1, a: 0, b: 120 }, { id: 2, a: 120, b: 240 }], xfade: [[116, 124]] };
  ok(JSON.stringify(redoRanges(meta, [200])) === "[[116,239]]", "redo 200");
  ok(JSON.stringify(redoRanges(meta, [10, 200])) === "[[0,239]]", "redo 10+200");
  const db = { next: 5, comments: [{ id: "c_001" }, { id: "c_004" }] };
  ok(newId(db) === "c_005", "id 5"); db.next++; ok(newId(db) === "c_006", "id after delete");
  const R = (h) => JSON.stringify(parseRange(h, 1000));
  ok(R("bytes=0-") === "[0,999]", "r0"); ok(R("bytes=100-199") === "[100,199]", "r1"); ok(R("bytes=0-5000") === "[0,999]", "r2");
  ok(R("bytes=1000-") === '"416"', "r3"); ok(R("bytes=abc") === '"416"', "r4"); ok(parseRange(undefined, 1000) === null, "r5");
  ok(shotOf(meta, 119).id === 1 && shotOf(meta, 120).id === 2, "shot lookup");
  ok(submitLine({ comments: [] }) === "submit: approved" && submitLine({ comments: [{ resolved: true }, { resolved: false }] }) === "submit: 1 notes", "submit line");
  ok(okBox(undefined) && okBox([0.1, 0.2, 0.3, 0.4]) && !okBox([0.8, 0, 0.5, 0.1]) && !okBox([0, 0, 1]) && !okBox("x"), "box check");
  console.log(process.exitCode ? "selftest FAILED" : "selftest ok");
}

function dump(name) {
  const meta = loadMeta(name), db = readDb(files(name).notes);
  warnStale(db, meta);
  const open = db.comments.filter((c) => !c.resolved).sort((p, q) => p.frame - q.frame);
  if (!open.length) return console.log("no open comments");
  const pc = (n) => Math.round(n * 100);
  for (const c of open) console.log(`s${c.shot} f${c.frame} [${c.tag}] ${c.id} ${c.text.replace(/\s+/g, " ")}` + (c.box ? ` (box: x ${pc(c.box[0])}% y ${pc(c.box[1])}% w ${pc(c.box[2])}% h ${pc(c.box[3])}% of the frame)` : ""));
  const pic = redoRanges(meta, open.filter((c) => ["look", "horizon", "other"].includes(c.tag)).map((c) => c.frame));
  const timing = open.filter((c) => c.tag === "timing");
  let line = `open ${open.length} | ` + (pic.length ? "--redo " + pic.map(([a, b]) => `${a}-${b}`).join(",") : "no picture re-render");
  if (timing.length) line += ` | timing notes: re-time, then re-render from shot ${Math.min(...timing.map((c) => c.shot))}`;
  console.log(line);
}

/** poll for out/<name>/submit.json (written by the player's Submit button); consume it, print the notes, exit 0 */
function waitSubmit(name) {
  const f = path.join(files(name).dir, "submit.json");
  setInterval(() => {
    if (!fs.existsSync(f)) return;
    fs.rmSync(f, { force: true });
    const db = readDb(files(name).notes), line = submitLine(db);
    console.log(line);
    if (line !== "submit: approved") dump(name);
    process.exit(0);
  }, 2000);
}

function resolve(name, ids) {
  const meta = loadMeta(name), p = files(name).notes, db = readDb(p);
  warnStale(db, meta);
  for (const id of ids) { const c = db.comments.find((x) => x.id === id); if (!c) fail(`no note ${id}`); c.resolved = true; }
  writeDb(p, db);
  console.log("resolved", ids.join(" "));
}

function serve(name, port, video, force) {
  const meta = loadMeta(name), notes = files(name).notes;
  if (!fs.existsSync(video)) fail(`missing ${video}`);
  const r = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", video], { encoding: "utf8" });
  const n = parseInt((r.stdout || "").trim(), 10); // ffprobe may print a trailing comma
  if (n !== meta.total && !force) fail(`${video} has ${n} frames, shots.json says ${meta.total}: frame numbers would be wrong (cut after the render?). Use the uncut video or --force`);
  warnStale(readDb(notes), meta);
  const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
  const body = (req) => new Promise((ok, no) => { let s = ""; req.on("data", (d) => { s += d; if (s.length > 65536) no(413); }); req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch { no(400); } }); });
  const hostOk = (req) => [`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host) && (req.headers["content-type"] || "").startsWith("application/json");

  http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      if (req.method === "GET" && url.pathname === "/") return send(res, 200, fs.readFileSync(path.join(HERE, "review.html"), "utf8"), "text/html; charset=utf-8");
      if (req.method === "GET" && url.pathname === "/video") {
        const size = fs.statSync(video).size, rg = parseRange(req.headers.range, size); // stat per request: a patch render may replace the file
        const h = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
        if (rg === "416") { res.writeHead(416, { ...h, "Content-Range": `bytes */${size}` }); return res.end(); }
        if (!rg) { res.writeHead(200, { ...h, "Content-Length": size }); return fs.createReadStream(video).pipe(res); }
        res.writeHead(206, { ...h, "Content-Range": `bytes ${rg[0]}-${rg[1]}/${size}`, "Content-Length": rg[1] - rg[0] + 1 });
        return fs.createReadStream(video, { start: rg[0], end: rg[1] }).pipe(res);
      }
      if (req.method === "GET" && url.pathname === "/api/meta") return send(res, 200, { name, fps: meta.fps, total: meta.total, shots: meta.shots, xfade: meta.xfade || [] });
      if (req.method === "GET" && url.pathname === "/api/comments") return send(res, 200, readDb(notes).comments);
      if (req.method === "POST" && url.pathname === "/api/submit") { // the agent's --wait-submit picks this up
        if (!hostOk(req)) return send(res, 403, { error: "forbidden" });
        fs.writeFileSync(path.join(files(name).dir, "submit.json"), JSON.stringify({ at: new Date().toISOString() }));
        return send(res, 200, { ok: true });
      }
      const m = /^\/api\/comments(?:\/(c_\d+))?$/.exec(url.pathname);
      if (!m || !["POST", "PATCH", "DELETE"].includes(req.method)) return send(res, 404, { error: "not found" });
      if (!hostOk(req)) return send(res, 403, { error: "forbidden" });
      const db = readDb(notes); // from disk every time: a CLI --resolve is never overwritten
      if (req.method === "POST" && !m[1]) {
        const { frame, tag, text, box } = await body(req);
        if (!Number.isInteger(frame) || frame < 0 || frame >= meta.total || !TAGS.includes(tag) || typeof text !== "string" || !okBox(box)) return send(res, 400, { error: "bad note" });
        const c = { id: newId(db), frame, time: Math.round((frame / meta.fps) * 1000) / 1000, shot: shotOf(meta, frame)?.id ?? null, total: meta.total, tag, text, ...(box ? { box } : {}), resolved: false, createdAt: new Date().toISOString() };
        db.next++; db.comments.push(c); writeDb(notes, db);
        return send(res, 200, c);
      }
      const c = m[1] && db.comments.find((x) => x.id === m[1]);
      if (!c) return send(res, 404, { error: "no such note" });
      if (req.method === "DELETE") { db.comments = db.comments.filter((x) => x !== c); writeDb(notes, db); return send(res, 200, { ok: true }); }
      const p = await body(req);
      if (Object.keys(p).some((k) => !["text", "tag", "resolved", "box"].includes(k)) || ("text" in p && typeof p.text !== "string") || ("tag" in p && !TAGS.includes(p.tag)) || ("resolved" in p && typeof p.resolved !== "boolean") || !okBox(p.box)) return send(res, 400, { error: "bad patch" });
      Object.assign(c, p); writeDb(notes, db);
      return send(res, 200, c);
    } catch (e) {
      if (!res.headersSent) send(res, typeof e === "number" ? e : 500, { error: String(e) });
    }
  }).listen(port, "127.0.0.1", () => console.log(`review ${name}: http://127.0.0.1:${port} (${video}, ${meta.total} frames). Ctrl+C to stop.`));
}

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
if (args[0] === "--selftest") selftest();
else if (!args[0] || args[0].startsWith("--")) fail("usage: node scripts/review.mjs <name> [--port 5177] [--video <path>] [--force] | <name> --dump | <name> --resolve c_001,c_002 | <name> --wait-submit | --selftest");
else if (args.includes("--dump")) dump(args[0]);
else if (args.includes("--wait-submit")) waitSubmit(args[0]);
else if (args.includes("--resolve")) resolve(args[0], (opt("--resolve") || "").split(",").filter(Boolean));
else serve(args[0], +(opt("--port") || 5177), opt("--video") || path.join("out", args[0], "video_final.mp4"), args.includes("--force"));
