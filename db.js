// const { Pool } = require("pg");

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
//   ssl: {
//     rejectUnauthorized: false,
//   },
//   // ssl: false
// });

// module.exports = pool;

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLED,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Idle Neon connections can be dropped; without this handler the process crashes.
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

module.exports = pool;
