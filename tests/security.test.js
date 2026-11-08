const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startApp } = require("./helpers");

let t;
before(async () => {
  t = await startApp();
});
after(() => t.close());

test("security headers are set and X-Powered-By is hidden", async () => {
  const r = await t.call("GET", "/products/abc");
  assert.equal(r.headers.get("x-powered-by"), null);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.ok(r.headers.get("strict-transport-security"));
  assert.ok(r.headers.get("ratelimit"), "rate-limit headers present");
});

test("malformed JSON returns a JSON 400 without stack traces", async () => {
  const r = await t.call("POST", "/auth/login", { raw: "{bad json" });
  assert.equal(r.status, 400);
  assert.ok(r.json?.message);
  assert.doesNotMatch(r.text, /at .*\.js|node_modules|<html/i);
});

test("authentication endpoints are rate limited (429 after 20 requests)", async () => {
  let last;
  for (let i = 0; i < 22; i++) {
    last = await t.call("POST", "/auth/login", { body: { email: "x@example.com", password: "Abcdef1!" } });
    if (last.status === 429) {
      assert.ok(i >= 20, `limited too early at request ${i + 1}`);
      assert.match(last.json.message, /too many/i);
      return;
    }
  }
  assert.fail("never rate limited; last status " + last.status);
});
