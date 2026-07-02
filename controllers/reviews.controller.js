const db = require("../db");

// ➕ add or update review
const addReview = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;
  const { rating, comment } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET rating = EXCLUDED.rating,
        comment = EXCLUDED.comment
        RETURNING *`,
      [userId, productId, rating, comment],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📥 get product reviews
const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const result = await db.query(
      `SELECT r.*, u.fname, u.lname
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ delete review
const deleteReview = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    await db.query(
      `DELETE FROM reviews
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addReview,
  getProductReviews,
  deleteReview,
};
