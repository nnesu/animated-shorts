// Bake house-style character templates (face prepared, library clips on the character's own rig) with headless Blender.
// usage: node scripts/bake_cast.mjs <Name ...|all> [--force]
// Skips characters whose public/models/chars3d/<Name>.glb exists unless --force. Sources stay untouched:
// public/models/quaternius-chars/<Name>.fbx (Ultimate Animated Character Pack) + public/models/quaternius-anim/*.glb.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BLENDER = process.env.BLENDER ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
/** standard clip set every template carries (Universal Animation Library 1 + 2 names) */
export const CLIPS = ["Idle_Loop", "Idle_Talking_Loop", "Walk_Formal_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Idle_FoldArms_Loop",
  "Sitting_Idle_Loop", "Sitting_Talking_Loop", "Yes", "Idle_No_Loop"];
const SRC = "public/models/quaternius-chars", OUT = "public/models/chars3d", LIBS = ["public/models/quaternius-anim/AnimationLibrary_Godot_Standard.glb", "public/models/quaternius-anim/UAL2_Standard.glb"];
const args = process.argv.slice(2), force = args.includes("--force");
let names = args.filter((a) => !a.startsWith("--"));
if (names[0] === "all") names = fs.readdirSync(SRC).filter((f) => f.endsWith(".fbx")).map((f) => f.slice(0, -4));
fs.mkdirSync(OUT, { recursive: true });
for (const n of names) {
  const out = path.resolve(OUT, `${n}.glb`);
  if (!force && fs.existsSync(out)) { console.log(`skip ${n}`); continue; }
  const t0 = Date.now();
  try {
    const log = execFileSync(BLENDER, ["-b", "-P", "scripts/blender/bake_chars.py", "--", `${SRC}/${n}.fbx`, out, CLIPS.join(","), ...LIBS], { encoding: "utf8", maxBuffer: 64 << 20 });
    const face = log.match(/^FACE .*$/m)?.[0] ?? "FACE none", miss = log.match(/^MISSING CLIPS .*$/m)?.[0] ?? "";
    console.log(`${n}: ${fs.existsSync(out) ? "ok" : "NO OUTPUT"} ${((Date.now() - t0) / 1000).toFixed(0)} s ${face} ${miss}`);
  } catch (e) { console.log(`${n}: FAILED ${String(e.stderr ?? e).split("\n").slice(-4).join(" | ")}`); }
}
