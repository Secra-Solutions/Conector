// Every test file runs in its own process (node --test) with a fresh, temporary data directory.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function tempDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "conector-test-"));
  process.env.CONECTOR_DATA_DIR = dir;
  return dir;
}

export const ROOT = path.resolve(import.meta.dirname, "..");
