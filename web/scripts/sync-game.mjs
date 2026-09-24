#!/usr/bin/env node
/**
 * Copy the built standalone distribution into the web shell.
 *
 *   node scripts/sync-game.mjs
 *
 * Only the two archives the loader fetches are copied. The loose openrct2.js and
 * openrct2.wasm beside them in the build output are inputs to openrct2.zip and are not
 * requested at runtime, so shipping them would double the deployed size.
 *
 * Development scenes are stripped here rather than filtered at runtime. The engine
 * cannot list them in any case, because it only ever scans `standalone/Scenarios`, but
 * a player build should not carry test content at all: it is payload nobody will load
 * and a path somebody could eventually guess.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const dist = join(repo, "engine", "openrct2", "build", "www-standalone");
const out = join(here, "..", "public", "game");

mkdirSync(out, { recursive: true });

const files = ["openrct2.zip", "assets.zip"];
const manifest = { syncedAt: new Date().toISOString(), files: {} };
for (const name of files) {
  const from = join(dist, name);
  const size = statSync(from).size;
  copyFileSync(from, join(out, name));
  manifest.files[name] = size;
  console.log(`${name.padEnd(16)} ${(size / 1e6).toFixed(2)} MB`);
}
// Strip the development scenes from the player build. `zip -d` exits 12 when the
// pattern matches nothing, which is the ordinary case for a pack that ships none.
const assets = join(out, "assets.zip");
try {
  execFileSync("zip", ["-q", "-d", assets, "standalone/DevScenarios/*"], { stdio: "pipe" });
  const after = statSync(assets).size;
  console.log(`stripped development scenes: assets.zip now ${(after / 1e6).toFixed(2)} MB`);
  manifest.files["assets.zip"] = after;
  manifest.strippedDevelopmentScenes = true;
} catch (error) {
  if (error.status !== 12) throw error;
  manifest.strippedDevelopmentScenes = false;
}

writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
const total = Object.values(manifest.files).reduce((a, b) => a + b, 0);
console.log(`first load ${(total / 1e6).toFixed(2)} MB from ${dist}`);
