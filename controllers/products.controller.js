const db = require("../db");

const getProducts = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id DESC");

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
      details: err,
    });
  }
};

// ADD product
const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, image_url } = req.body;

    const result = await db.query(
      `INSERT INTO products (name, description, price, stock, image_url)
            VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
      [name, description, price, stock, image_url],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, image_url } = req.body;

    const result = await db.query(
      `UPDATE products
             SET name=$1, description=$2, price=$3, stock=$4, image_url=$5
             WHERE id=$6
             RETURNING *`,
      [name, description, price, stock, image_url, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
};
