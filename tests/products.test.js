const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { startApp } = require("./helpers");

let t;
before(async () => {
  t = await startApp();
});
after(() => t.close());
beforeEach(() => t.reset());

const valid = { name: "Lamp", description: "Desk lamp", price: 19.99, stock: 5 };

test("GET /products/:id returns 404 for a non-numeric id without querying the DB", async () => {
  const r = await t.call("GET", "/products/abc");
  assert.equal(r.status, 404);
  assert.equal(t.calls.length, 0);
});

test("GET /products/:id returns the product when it exists", async () => {
  t.setHandler(() => ({ rows: [{ id: 1, name: "Lamp" }] }));
  const r = await t.call("GET", "/products/1");
  assert.equal(r.status, 200);
  assert.equal(r.json.name, "Lamp");
});

test("GET /products rejects a non-numeric category_id with 400", async () => {
  const r = await t.call("GET", "/products?category_id=abc");
  assert.equal(r.status, 400);
});

test("product validation: invalid price/stock/name are rejected (400)", async () => {
  const token = t.token("admin");
  const bad = [
    { ...valid, price: 0 },
    { ...valid, price: -5 },
    { ...valid, price: "abc" },
    { ...valid, price: undefined },
    { ...valid, stock: -1 },
    { ...valid, stock: 1.5 },
    { ...valid, stock: undefined },
    { ...valid, name: "  " },
    { ...valid, description: undefined },
    { ...valid, category_id: "abc" },
  ];
  for (const body of bad) {
    const r = await t.call("POST", "/products", { body, token });
    assert.equal(r.status, 400, JSON.stringify(body));
  }
  assert.equal(t.calls.length, 0);
});

test("admin can create a product without image or category (both optional)", async () => {
  t.setHandler((sql) => (sql.startsWith("INSERT INTO products") ? { rows: [{ id: 9, ...valid }] } : undefined));
  const r = await t.call("POST", "/products", { body: valid, token: t.token("admin") });
  assert.equal(r.status, 200);
  const insert = t.calls.find((c) => c.sql.startsWith("INSERT INTO products"));
  assert.equal(insert.params[4], null, "image_url");
  assert.equal(insert.params[5], null, "category_id");
});

test("product update is validated too (PUT)", async () => {
  const r = await t.call("PUT", "/products/1", { body: { ...valid, price: 0 }, token: t.token("admin") });
  assert.equal(r.status, 400);
});

test("deleting a product that is referenced by orders returns 409 and keeps the image", async () => {
  t.setHandler((sql) => {
    if (sql.startsWith("SELECT * FROM products")) return { rows: [{ id: 1, cloudinary_id: "products/abc" }] };
    if (sql.startsWith("DELETE FROM products")) throw Object.assign(new Error("fk"), { code: "23503" });
  });
  const r = await t.call("DELETE", "/products/1", { token: t.token("admin") });
  assert.equal(r.status, 409);
});
