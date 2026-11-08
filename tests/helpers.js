// Test helpers: boots the real Express app with the database and mailer mocked,
// so tests never touch Neon or send email.
process.env.JWT_SECRET = "test-only-secret";
process.env.NODE_ENV = "test";
process.env.FRONTEND_URL = "http://localhost:3000";

const path = require("path");
const jwt = require("jsonwebtoken");

function mockModule(relPath, exports) {
  const file = require.resolve(path.join(__dirname, "..", relPath));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}

async function startApp() {
  const calls = [];
  const sentMails = [];
  let handler = () => ({ rows: [], rowCount: 0 });

  const run = async (sql, params) => {
    const text = String(sql).replace(/\s+/g, " ").trim();
    calls.push({ sql: text, params });
    const result = await handler(text, params);
    return result ?? { rows: [], rowCount: 0 };
  };
  const db = {
    query: run,
    connect: async () => ({ query: run, release() {} }),
    on() {},
    end() {},
  };

  mockModule("db.js", db);
  mockModule("config/mailer.js", {
    emails: {
      send: async (msg) => {
        sentMails.push(msg);
        return { data: { id: "test" } };
      },
    },
  });

  const app = require("../index.js");
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const call = async (method, urlPath, { body, token, raw } = {}) => {
    const res = await fetch(base + urlPath, {
      method,
      headers: {
        ...(body !== undefined || raw ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text, headers: res.headers };
  };

  return {
    call,
    calls,
    sentMails,
    setHandler: (h) => {
      handler = h;
    },
    reset: () => {
      calls.length = 0;
      sentMails.length = 0;
      handler = () => ({ rows: [], rowCount: 0 });
    },
    close: () => new Promise((resolve) => server.close(resolve)),
    token: (role = "user", id = 1) =>
      jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" }),
  };
}

module.exports = { startApp };
