const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { startApp } = require("./helpers");

let t;
before(async () => {
  t = await startApp();
});
after(() => t.close());
beforeEach(() => t.reset());

const sqlOf = () => t.calls.map((c) => c.sql);
const dbError = (code) => Object.assign(new Error("db"), { code });

// ---------- wishlist ----------
test("wishlist: invalid product ids are rejected with 400 before the DB", async () => {
  const token = t.token();
  for (const id of ["abc", "-5", "0", "1.5"]) {
    assert.equal((await t.call("POST", `/wishlist/${id}`, { token })).status, 400, id);
    assert.equal((await t.call("DELETE", `/wishlist/${id}`, { token })).status, 400, id);
  }
  assert.equal(t.calls.length, 0);
});

test("wishlist: a nonexistent product returns 404 (FK violation) without leaking DB text", async () => {
  t.setHandler(() => {
    throw dbError("23503");
  });
  const r = await t.call("POST", "/wishlist/99999999", { token: t.token() });
  assert.equal(r.status, 404);
  assert.doesNotMatch(r.text, /constraint|violates/i);
});

test("wishlist: out-of-range integer id returns 400", async () => {
  t.setHandler(() => {
    throw dbError("22003");
  });
  const r = await t.call("POST", "/wishlist/99999999999", { token: t.token() });
  assert.equal(r.status, 400);
});

test("wishlist: add succeeds and is scoped to the caller", async () => {
  t.setHandler(() => ({ rows: [{ id: 1, user_id: 4, product_id: 2 }] }));
  const r = await t.call("POST", "/wishlist/2", { token: t.token("user", 4) });
  assert.equal(r.status, 200);
  assert.deepEqual(t.calls[0].params, [4, "2"]);
});

// ---------- reviews ----------
test("reviews: invalid rating is rejected with 400", async () => {
  for (const rating of [0, 6, 9, 4.5, "5", undefined]) {
    const r = await t.call("POST", "/reviews/1", { body: { rating }, token: t.token() });
    assert.equal(r.status, 400, String(rating));
  }
  assert.equal(t.calls.length, 0);
});

test("reviews: reviewing a nonexistent product returns 404 and rolls back", async () => {
  t.setHandler((sql) => {
    if (sql.startsWith("INSERT INTO reviews")) throw dbError("23503");
  });
  const r = await t.call("POST", "/reviews/99999999", { body: { rating: 5 }, token: t.token() });
  assert.equal(r.status, 404);
  assert.ok(sqlOf().includes("ROLLBACK"));
  assert.ok(!sqlOf().includes("COMMIT"));
});

test("reviews: adding a review recalculates products.avg_rating inside the transaction", async () => {
  t.setHandler((sql) => (sql.startsWith("INSERT INTO reviews") ? { rows: [{ id: 1, rating: 5 }] } : undefined));
  const r = await t.call("POST", "/reviews/3", { body: { rating: 5, comment: "ok" }, token: t.token() });
  assert.equal(r.status, 200);
  const s = sqlOf();
  const iBegin = s.indexOf("BEGIN");
  const iInsert = s.findIndex((x) => x.startsWith("INSERT INTO reviews"));
  const iAvg = s.findIndex((x) => x.startsWith("UPDATE products SET avg_rating"));
  const iCommit = s.indexOf("COMMIT");
  assert.ok(iBegin >= 0 && iBegin < iInsert && iInsert < iAvg && iAvg < iCommit, s.join(" | "));
  assert.deepEqual(t.calls[iAvg].params, ["3"]);
});

test("reviews: deleting a review recalculates avg_rating for that product", async () => {
  t.setHandler((sql) => (sql.startsWith("DELETE FROM reviews") ? { rows: [{ product_id: 8 }], rowCount: 1 } : undefined));
  const r = await t.call("DELETE", "/reviews/5", { token: t.token("user", 2) });
  assert.equal(r.status, 200);
  const del = t.calls.find((c) => c.sql.startsWith("DELETE FROM reviews"));
  assert.deepEqual(del.params, ["5", 2], "scoped to the owner");
  const avg = t.calls.find((c) => c.sql.startsWith("UPDATE products SET avg_rating"));
  assert.deepEqual(avg.params, [8]);
  assert.ok(sqlOf().includes("COMMIT"));
});

test("reviews: deleting someone else's / missing review returns 404 and rolls back", async () => {
  t.setHandler(() => ({ rows: [], rowCount: 0 }));
  const r = await t.call("DELETE", "/reviews/5", { token: t.token() });
  assert.equal(r.status, 404);
  assert.ok(sqlOf().includes("ROLLBACK"));
  assert.ok(!sqlOf().some((x) => x.startsWith("UPDATE products")));
});

test("reviews: non-numeric review id returns 400", async () => {
  const r = await t.call("DELETE", "/reviews/abc", { token: t.token() });
  assert.equal(r.status, 400);
});
