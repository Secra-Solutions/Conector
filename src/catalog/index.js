// Loads every app definition in ./apps (one file per group; each exports an array). A broken file or definition is
// skipped and reported in the panel, but never stops the server.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConnector } from "./define.js";

const DIR = path.join(import.meta.dirname, "apps");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js")).sort();

export const CATALOG_ERRORS = [];
const report = (message) => {
  CATALOG_ERRORS.push(message);
  console.error(`Catalog: ${message}`);
};

const seen = new Map();
export const CATALOG = [];
for (const f of files) {
  let defs;
  try {
    defs = (await import(pathToFileURL(path.join(DIR, f)).href)).default;
    if (!Array.isArray(defs)) throw new Error("does not export an array of app definitions");
  } catch (e) {
    report(`${f} was not loaded: ${e.message}`);
    continue;
  }
  for (const def of defs) {
    if (seen.has(def?.id)) {
      report(`duplicate app "${def.id}" in ${seen.get(def.id)} and ${f}; keeping the first one`);
      continue;
    }
    try {
      CATALOG.push(defineConnector(def));
      seen.set(def.id, f);
    } catch (e) {
      report(`${f}: ${e.message}`);
    }
  }
}
