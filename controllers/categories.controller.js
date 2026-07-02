const db = require("../db");

const getCategories = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM categories ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCategories,
};
