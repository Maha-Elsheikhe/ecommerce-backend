const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { startApp } = require("./helpers");

let t;
before(async () => {
  t = await startApp();
});
after(() => t.close());
beforeEach(() => t.reset());

const adminOnly = [
  ["POST", "/products", { name: "x", description: "d", price: 1, stock: 1 }],
  ["PUT", "/products/1", { name: "x", description: "d", price: 1, stock: 1 }],
  ["DELETE", "/products/1"],
  ["POST", "/coupons", { code: "X", discount_percent: 10 }],
  ["GET", "/coupons"],
  ["DELETE", "/coupons/1"],
  ["PATCH", "/orders/1/status", { status: "paid" }],
  ["GET", "/admin/analytics"],
];

const userOnly = [
  ["GET", "/cart"],
  ["POST", "/cart", { product_id: 1, quantity: 1 }],
  ["PUT", "/cart/1", { quantity: 1 }],
  ["DELETE", "/cart/1"],
  ["GET", "/orders"],
  ["GET", "/orders/1"],
  ["POST", "/orders/checkout", {}],
  ["GET", "/wishlist"],
  ["POST", "/wishlist/1"],
  ["DELETE", "/wishlist/1"],
  ["POST", "/reviews/1", { rating: 5 }],
  ["DELETE", "/reviews/1"],
  ["POST", "/coupons/validate", { code: "X" }],
];

test("admin routes reject requests without a token (401)", async () => {
  for (const [m, p, body] of adminOnly) {
    const r = await t.call(m, p, { body });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});

test("admin routes reject a regular user (403) and never reach the database", async () => {
  const token = t.token("user");
  for (const [m, p, body] of adminOnly) {
    const r = await t.call(m, p, { body, token });
    assert.equal(r.status, 403, `${m} ${p}`);
  }
  assert.equal(t.calls.length, 0);
});

test("user routes reject requests without a token (401)", async () => {
  for (const [m, p, body] of userOnly) {
    const r = await t.call(m, p, { body });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});

test("invalid and tampered tokens are rejected (401)", async () => {
  assert.equal((await t.call("GET", "/cart", { token: "abc.def.ghi" })).status, 401);
  const tampered = t.token("user") + "x";
  assert.equal((await t.call("GET", "/cart", { token: tampered })).status, 401);
});

test("an admin token passes the admin check", async () => {
  t.setHandler((sql) => (sql.includes("COUNT") || sql.includes("SUM") ? { rows: [{ count: "3", total: "10" }] } : { rows: [] }));
  const r = await t.call("GET", "/admin/analytics", { token: t.token("admin") });
  assert.equal(r.status, 200);
  assert.equal(r.json.totalUsers, 3);
});

test("a user cannot read another user's order", async () => {
  // The query is scoped to the caller: no row is returned for someone else's order.
  t.setHandler(() => ({ rows: [] }));
  const r = await t.call("GET", "/orders/5", { token: t.token("user", 2) });
  assert.equal(r.status, 404);
  const q = t.calls.find((c) => c.sql.includes("FROM orders"));
  assert.ok(q.sql.includes("user_id"));
  assert.deepEqual(q.params, ["5", 2]);
});
