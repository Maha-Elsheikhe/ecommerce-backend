require("dotenv").config();

const pool = require("./db");

async function testConnection() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("Database connected successfully!");
    console.log("Existing tables:");

    console.table(result.rows);
  } catch (error) {
    console.error("Database error:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
