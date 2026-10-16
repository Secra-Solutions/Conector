import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ROOT } from "./helpers.js";

/** Copies config.js into a fake package folder and prints the data directory it picks, with a fake home directory. */
function dataDirFor(packageDir) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "conector-config-")));
  const pkg = path.join(tmp, packageDir);
  fs.mkdirSync(path.join(pkg, "src"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(pkg, "package.json"));
  fs.copyFileSync(path.join(ROOT, "src", "config.js"), path.join(pkg, "src", "config.js"));
  const env = { ...process.env, HOME: path.join(tmp, "home") };
  delete env.CONECTOR_DATA_DIR;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    `const { CONFIG } = await import(${JSON.stringify(path.join(pkg, "src", "config.js"))}); console.log(CONFIG.dataDir);`],
  { cwd: tmp, env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return { tmp, pkg, dataDir: r.stdout.trim() };
}

test("a clone keeps its data in ./data", () => {
  const { pkg, dataDir } = dataDirFor("Conector");
  assert.equal(dataDir, path.join(pkg, "data"));
});

test("a package installed from npm keeps its data in ~/.conector", () => {
  const { tmp, dataDir } = dataDirFor(path.join("node_modules", "conector"));
  assert.equal(dataDir, path.join(tmp, "home", ".conector"));
});
