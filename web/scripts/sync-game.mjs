#!/usr/bin/env node
/**
 * Copy the built standalone distribution into the web shell.
 *
 *   node scripts/sync-game.mjs
 *
 * Only the two archives the loader fetches are copied. The loose openrct2.js and
 * openrct2.wasm beside them in the build output are inputs to openrct2.zip and are not
 * requested at runtime, so shipping them would double the deployed size.
 */
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
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
const total = Object.values(manifest.files).reduce((a, b) => a + b, 0);
console.log(`first load ${(total / 1e6).toFixed(2)} MB from ${dist}`);
