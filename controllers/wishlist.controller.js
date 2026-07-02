const db = require("../db");

// ➕ add to wishlist
const addToWishlist = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  try {
    const result = await db.query(
      `INSERT INTO wishlist (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING
       RETURNING *`,
      [userId, productId],
    );

    res.json(result.rows[0] || { message: "Already in wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 📥 get wishlist
const getWishlist = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT w.id, p.*
       FROM wishlist w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ remove from wishlist
const removeFromWishlist = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  try {
    await db.query(
      `DELETE FROM wishlist
        WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );

    res.json({ message: "Removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};