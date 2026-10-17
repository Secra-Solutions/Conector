import assert from "node:assert/strict";
import { test } from "node:test";
import "./helpers.js";

const { normalizeUrl } = await import("../src/catalog/define.js");

function withPrivateHttp(value, fn) {
  const before = process.env.CONECTOR_ALLOW_PRIVATE_HTTP;
  if (value === undefined) delete process.env.CONECTOR_ALLOW_PRIVATE_HTTP;
  else process.env.CONECTOR_ALLOW_PRIVATE_HTTP = value;
  try {
    fn();
  } finally {
    if (before === undefined) delete process.env.CONECTOR_ALLOW_PRIVATE_HTTP;
    else process.env.CONECTOR_ALLOW_PRIVATE_HTTP = before;
  }
}

test("by default self-hosted URLs need https://, except on localhost", () => withPrivateHttp(undefined, () => {
  assert.equal(normalizeUrl("https://ha.example.com:8123/"), "https://ha.example.com:8123");
  assert.equal(normalizeUrl("https://192.168.1.10:8123"), "https://192.168.1.10:8123");
  assert.equal(normalizeUrl("http://localhost:8123"), "http://localhost:8123");
  assert.throws(() => normalizeUrl("http://192.168.1.10:8123"), /CONECTOR_ALLOW_PRIVATE_HTTP=1/);
  assert.throws(() => normalizeUrl("http://example.com"), /must start with https:\/\/$/);
}));

test("CONECTOR_ALLOW_PRIVATE_HTTP=1 accepts http:// on private network addresses only", () => withPrivateHttp("1", () => {
  for (const url of ["http://192.168.1.10:8123", "http://10.0.0.5", "http://172.20.1.1", "http://100.100.1.1",
    "http://homeassistant.local:8123", "http://nas.lan", "http://router.home.arpa", "http://homeassistant:8123",
    "http://host.docker.internal:8123", "http://[fd12:3456::1]:8080"]) {
    assert.equal(normalizeUrl(url), url.replace(/\/$/, ""), url);
  }
  for (const url of ["http://example.com", "http://8.8.8.8", "http://172.32.0.1", "http://169.254.169.254",
    "http://metadata.google.internal", "http://[fd00:ec2::254]"]) {
    assert.throws(() => normalizeUrl(url), /must start with https:\/\//, url);
  }
}));
