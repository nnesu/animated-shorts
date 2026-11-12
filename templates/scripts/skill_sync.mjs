// Compares the live engine (scripts/*, src/shared/*.ts) with the skill's copies (templates/scripts/*, templates/shared/*)
// by sha1, prints each mismatch with the cp line that brings the skill up to date, exits 1 on any mismatch.
// Not compared on purpose: templates/starter/* (per-video starter files: story data only, no live copy) and
// templates/audio/* (no live copy; the generic mixer lives only in the skill).
// usage: node scripts/skill_sync.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SKILL = ".claude/skills/cartoon-3d-short/templates";
const PAIRS = [["scripts", `${SKILL}/scripts`, (f) => true], ["src/shared", `${SKILL}/shared`, (f) => /\.tsx?$/.test(f)]];
const sha = (f) => crypto.createHash("sha1").update(fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n")).digest("hex"); // line endings ignored: git checkouts may rewrite them
let bad = 0;
for (const [live, tpl, keep] of PAIRS) {
  const isFile = (n) => [live, tpl].some((d) => fs.existsSync(`${d}/${n}`) && fs.statSync(`${d}/${n}`).isFile());
  const names = new Set([...fs.readdirSync(live), ...fs.readdirSync(tpl)].filter((n) => keep(n) && isFile(n))); // files only (skips __pycache__)
  for (const n of [...names].sort()) {
    const a = path.posix.join(live, n), b = path.posix.join(tpl, n);
    const ea = fs.existsSync(a), eb = fs.existsSync(b);
    if (ea && eb && sha(a) === sha(b)) continue;
    bad++;
    if (!eb) console.log(`MISSING in skill: ${b}\n  cp "${a}" "${b}"`);
    else if (!ea) console.log(`ONLY in skill (no live copy): ${b}\n  cp "${b}" "${a}"   # or delete it from the skill`);
    else console.log(`DIFFERS: ${a} vs ${b}\n  cp "${a}" "${b}"   # if the live copy is the right one`);
  }
}
console.log(bad ? `${bad} mismatch(es)` : "skill templates match the live scripts and src/shared");
process.exit(bad ? 1 : 0);
