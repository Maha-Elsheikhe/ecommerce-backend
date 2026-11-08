const db = require("../db");

// Keep products.avg_rating in sync (the database has no trigger for it).
const updateAvgRating = (client, productId) =>
  client.query(
    `UPDATE products
     SET avg_rating = COALESCE(
       (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE product_id = $1), 0)
     WHERE id = $1`,
    [productId],
  );

// ➕ add or update review
const addReview = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!Number.isInteger(Number(productId)) || Number(productId) <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be an integer from 1 to 5" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET rating = EXCLUDED.rating,
        comment = EXCLUDED.comment
        RETURNING *`,
      [userId, productId, rating, comment],
    );
    await updateAvgRating(client, productId);
    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23503") {
      return res.status(404).json({ message: "Product not found" });
    }
    if (err.code === "22003") {
      return res.status(400).json({ message: "Invalid product id" });
    }
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

// 📥 get product reviews
const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  if (!Number.isInteger(Number(productId)) || Number(productId) <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

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

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({ message: "Invalid review id" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `DELETE FROM reviews
       WHERE id = $1 AND user_id = $2
       RETURNING product_id`,
      [id, userId],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Review not found" });
    }

    await updateAvgRating(client, result.rows[0].product_id);
    await client.query("COMMIT");
    res.json({ message: "Deleted" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "22003") {
      return res.status(400).json({ message: "Invalid review id" });
    }
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = {
  addReview,
  getProductReviews,
  deleteReview,
};
