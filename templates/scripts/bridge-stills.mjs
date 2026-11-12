// usage: node scripts/bridge-stills.mjs <outPrefix> <frame,frame,...> [scale]  (bundles once, GPU via ANGLE, jpeg)
// BRIDGE_ENTRY=src/sandboxes/<name>/index.tsx renders a sandbox copy instead of the main project entry.
import fs from "node:fs";
// each bundle copies public/ (~1.3 GB) into the temp dir; this PC has no D: drive: REMOTION_TMP=C:/remotion-tmp
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.BRIDGE_ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id: process.env.COMP || (console.warn("COMP not set: rendering BridgeShort"), "BridgeShort"), browserExecutable, chromiumOptions, inputProps });
const qaLog = `${prefix}qadump.jsonl`; // QADUMP lines (src/shared/qadump.ts) go here in full, for scripts/qa_geometry.py
fs.rmSync(qaLog, { force: true }); // fresh log per run: re-rendered stills must not keep stale geometry
const onBrowserLog = (l) => {
  if (l.text.startsWith("QADUMP ")) return fs.appendFileSync(qaLog, l.text.slice(7) + "\n");
  if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 900));
};
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, inputProps, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
