import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { tempDataDir } from "./helpers.js";

const dir = tempDataDir();
const store = await import("../src/store.js");
const { runAs } = await import("../src/context.js");

test("credentials are encrypted at rest", () => {
  store.saveCredentials("github", { token: "test-secret-value-123" }, { scope: store.SHARED });
  const raw = fs.readFileSync(path.join(dir, "store.json"), "utf8");
  assert.ok(!raw.includes("test-secret-value-123"));
  assert.equal(store.getCredentialsIn("github", store.SHARED).token, "test-secret-value-123");
  assert.equal((fs.statSync(path.join(dir, "master.key")).mode & 0o777).toString(8), "600");
});

test("encrypt/decrypt round trip and tamper detection", () => {
  const box = store.encrypt({ a: 1 });
  assert.deepEqual(store.decrypt(box), { a: 1 });
  const tampered = `${box.slice(0, -4)}AAAA`;
  assert.throws(() => store.decrypt(tampered));
});

test("a personal connection wins over the shared one", () => {
  store.saveCredentials("github", { token: "personal-token-123" }, { scope: store.personalScope("u1") });
  const mine = runAs({ userId: "u1", via: "test" }, () => store.getCredentials("github"));
  const theirs = runAs({ userId: "u2", via: "test" }, () => store.getCredentials("github"));
  assert.equal(mine.token, "personal-token-123");
  assert.equal(mine[store.SCOPE], store.personalScope("u1"));
  assert.equal(theirs.token, "test-secret-value-123");
  assert.equal(theirs[store.SCOPE], store.SHARED);
  store.deletePersonalConnections("u1");
  assert.equal(runAs({ userId: "u1", via: "test" }, () => store.getCredentials("github")).token, "test-secret-value-123");
});
