const db = require("../db");

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    const existingItem = await db.query(
      `SELECT * FROM cart
             WHERE user_id = $1
             AND product_id = $2`,
      [userId, product_id],
    );

    if (existingItem.rows.length > 0) {
      const result = await db.query(
        `UPDATE cart
                 SET quantity = quantity + $1
                 WHERE user_id = $2
                 AND product_id = $3
                 RETURNING *`,
        [quantity, userId, product_id],
      );

      return res.json(result.rows[0]);
    }

    const result = await db.query(
      `INSERT INTO cart
            (user_id, product_id, quantity)
            VALUES ($1,$2,$3)
            RETURNING *`,
      [userId, product_id, quantity],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT
                c.id,
                c.quantity,

                p.id AS product_id,
                p.name,
                p.price,
                p.image_url

            FROM cart c

            JOIN products p
            ON c.product_id = p.id

            WHERE c.user_id = $1`,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    const result = await db.query(
      `UPDATE cart
             SET quantity = $1
             WHERE id = $2
             AND user_id = $3
             RETURNING *`,
      [quantity, id, userId],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.query(
      `DELETE FROM cart
             WHERE id = $1
             AND user_id = $2`,
      [id, userId],
    );

    res.json({
      message: "Item removed",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
};
