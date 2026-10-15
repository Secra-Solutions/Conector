import assert from "node:assert/strict";
import { test } from "node:test";
import { tempDataDir } from "./helpers.js";

tempDataDir();
const auth = await import("../src/auth.js");

test("first admin, password policy and sign-in", () => {
  assert.equal(auth.hasUsers(), false);
  assert.throws(() => auth.createUser({ email: "admin@example.com", password: "short" }), /at least 12/);
  const admin = auth.createUser({ email: "Admin@Example.com", name: "Admin", role: "admin", password: "correct-horse-battery" });
  assert.equal(admin.email, "admin@example.com");
  assert.equal(auth.verifyPassword("admin@example.com", "correct-horse-battery")?.id, admin.id);
  assert.equal(auth.verifyPassword("admin@example.com", "wrong-password-123"), null);
  assert.equal(auth.verifyPassword("nobody@example.com", "correct-horse-battery"), null);
  assert.equal(auth.publicUser(admin).hash, undefined);
});

test("the last admin can't be demoted, disabled or deleted", () => {
  const admin = auth.findUserByEmail("admin@example.com");
  assert.throws(() => auth.updateUser(admin.id, { role: "member" }), /at least one admin/);
  assert.throws(() => auth.updateUser(admin.id, { disabled: true }), /last admin/);
  assert.throws(() => auth.deleteUser(admin.id), /last admin/);
});

test("setup code is single use", () => {
  const code = auth.createSetupCode();
  assert.equal(auth.checkSetupCode(code), true);
  assert.equal(auth.checkSetupCode("nope"), false);
  auth.consumeSetupCode();
  assert.equal(auth.checkSetupCode(code), false);
});

test("invitations and password resets are single-use links", () => {
  const { token } = auth.createInvite({ email: "member@example.com", role: "member", createdBy: "test" });
  assert.ok(auth.findInvite(token));
  const member = auth.acceptInvite(token, { name: "Member", password: "another-long-password" });
  assert.equal(member.role, "member");
  assert.equal(auth.findInvite(token), null);
  assert.throws(() => auth.createInvite({ email: "member@example.com" }), /already exists/);

  const reset = auth.createReset(member.id);
  auth.useReset(reset, "a-brand-new-password");
  assert.ok(auth.verifyPassword("member@example.com", "a-brand-new-password"));
  assert.throws(() => auth.useReset(reset, "yet-another-password"), /not valid/);
});

test("access tokens: shown once, hashed, scoped and revocable", () => {
  const member = auth.findUserByEmail("member@example.com");
  const { id, token } = auth.createToken({ name: "Laptop", userId: member.id, apps: ["github"] });
  assert.match(token, /^cnr_[\w-]{40,}$/);
  const t = auth.validateToken(token);
  assert.equal(t.user.id, member.id);
  assert.equal(auth.allowed(t, "github"), true);
  assert.equal(auth.allowed(t, "notion"), false);
  assert.ok(!JSON.stringify(auth.allTokens()).includes(token), "the token itself is never stored");
  auth.revokeToken(id);
  assert.equal(auth.validateToken(token), null);
});

test("disabled users lose their sessions and tokens stop working", () => {
  const member = auth.findUserByEmail("member@example.com");
  const { token } = auth.createToken({ name: "CLI", userId: member.id });
  const session = auth.startSession(member.id);
  assert.ok(auth.getSession(session));
  auth.updateUser(member.id, { disabled: true });
  assert.equal(auth.getSession(session), null);
  assert.equal(auth.validateToken(token), null);
  auth.updateUser(member.id, { disabled: false });
  assert.ok(auth.validateToken(token));
});
