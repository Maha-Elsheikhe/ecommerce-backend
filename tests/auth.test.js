const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { startApp } = require("./helpers");

let t;
let hash;
before(async () => {
  t = await startApp();
  hash = await bcrypt.hash("Abcdef1!", 4);
});
after(() => t.close());
beforeEach(() => t.reset());

const newUser = { fname: "A", lname: "B", email: "a@example.com", password: "Abcdef1!" };

test("register rejects a missing password with 400", async () => {
  const r = await t.call("POST", "/auth/register", { body: { ...newUser, password: undefined } });
  assert.equal(r.status, 400);
  assert.match(r.json.message, /required/i);
});

test("register rejects a non-string password with 400", async () => {
  const r = await t.call("POST", "/auth/register", { body: { ...newUser, password: 12345678 } });
  assert.equal(r.status, 400);
});

test("register rejects weak passwords (policy preserved)", async () => {
  for (const password of ["short1!", "alllowercase1!", "ALLUPPERCASE1!", "NoNumbers!!", "NoSpecial123"]) {
    const r = await t.call("POST", "/auth/register", { body: { ...newUser, password } });
    assert.equal(r.status, 400, password);
  }
});

test("register: new and existing emails get an identical response (no enumeration)", async () => {
  t.setHandler((sql) => {
    if (sql.startsWith("SELECT id FROM users")) return { rows: [] };
    if (sql.startsWith("INSERT INTO users")) return { rows: [{ id: 1 }] };
  });
  const fresh = await t.call("POST", "/auth/register", { body: newUser });
  assert.equal(t.sentMails.length, 1);

  t.reset();
  t.setHandler((sql) => {
    if (sql.startsWith("SELECT id FROM users")) return { rows: [{ id: 1 }] };
  });
  const existing = await t.call("POST", "/auth/register", { body: newUser });

  assert.equal(fresh.status, 201);
  assert.equal(existing.status, fresh.status);
  assert.deepEqual(existing.json, fresh.json);
  assert.equal(t.sentMails.length, 0, "no email for an existing account");
  assert.ok(!t.calls.some((c) => c.sql.startsWith("INSERT INTO users")));
});

test("resend-verification and request-reset do not reveal whether the email exists", async () => {
  const unknown = await t.call("POST", "/auth/resend-verification", { body: { email: "no@example.com" } });
  t.setHandler((sql) => {
    if (sql.startsWith("SELECT * FROM users")) return { rows: [{ id: 2, is_verified: false }] };
  });
  const known = await t.call("POST", "/auth/resend-verification", { body: { email: "yes@example.com" } });
  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200);
  assert.deepEqual(unknown.json, known.json);

  t.reset();
  const unknownReset = await t.call("POST", "/auth/request-reset-password", { body: { email: "no@example.com" } });
  t.setHandler((sql) => {
    if (sql.startsWith("SELECT id, fname FROM users")) return { rows: [{ id: 2, fname: "X" }] };
  });
  const knownReset = await t.call("POST", "/auth/request-reset-password", { body: { email: "yes@example.com" } });
  assert.equal(unknownReset.status, 200);
  assert.equal(knownReset.status, 200);
  assert.deepEqual(unknownReset.json, knownReset.json);
});

test("login: unknown email and wrong password are indistinguishable (401)", async () => {
  const unknown = await t.call("POST", "/auth/login", { body: { email: "no@example.com", password: "Abcdef1!" } });
  t.setHandler(() => ({ rows: [{ id: 1, email: "a@example.com", password_hash: hash, role: "user", is_verified: true }] }));
  const wrong = await t.call("POST", "/auth/login", { body: { email: "a@example.com", password: "Wrong1!aa" } });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.deepEqual(unknown.json, wrong.json);
});

test("login: unverified account gets 403 only after the password is correct", async () => {
  t.setHandler(() => ({ rows: [{ id: 1, email: "a@example.com", password_hash: hash, role: "user", is_verified: false }] }));
  const r = await t.call("POST", "/auth/login", { body: { email: "a@example.com", password: "Abcdef1!" } });
  assert.equal(r.status, 403);
  assert.equal(r.json.needsVerification, true);
});

test("login: verified account receives a JWT and user info", async () => {
  t.setHandler(() => ({
    rows: [{ id: 7, fname: "A", lname: "B", email: "a@example.com", password_hash: hash, role: "user", is_verified: true }],
  }));
  const r = await t.call("POST", "/auth/login", { body: { email: "a@example.com", password: "Abcdef1!" } });
  assert.equal(r.status, 200);
  assert.ok(r.json.token);
  assert.equal(r.json.user.role, "user");
  assert.equal(r.json.user.password_hash, undefined);
});
