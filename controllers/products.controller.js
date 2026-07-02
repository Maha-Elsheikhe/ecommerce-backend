const express = require("express");
const db = require("../db");
const streamifier = require("streamifier");
const router = express.Router();
const cloudinary = require("../config/cloudinary");
const upload = require("../middlewares/upload");

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query("SELECT * FROM products WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { search, category_id } = req.query;

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`name ILIKE $${values.length}`);
    }

    if (category_id) {
      values.push(category_id);
      conditions.push(`category_id = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query(
      `SELECT * FROM products ${where} ORDER BY id DESC`,
      values,
    );

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
// const addProduct = async (req, res) => {
//   try {
//     const { name, description, price, stock, image_url } = req.body;

//     const result = await db.query(
//       `INSERT INTO products (name, description, price, stock, image_url)
//             VALUES ($1, $2, $3, $4, $5)
//              RETURNING *`,
//       [name, description, price, stock, image_url],
//     );

//     res.json(result.rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// ADD product
const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category_id } = req.body;
    const categoryId = category_id || null;

    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "products" },
        async (error, result) => {
          if (error) {
            return res.status(500).json({ error: error.message });
          }

          const image = result.secure_url;
          const publicId = result.public_id;

          const dbResult = await db.query(
            `INSERT INTO products (name, description, price, stock, image_url, cloudinary_id, category_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [name, description, price, stock, image, publicId, categoryId],
          );

          return res.json(dbResult.rows[0]);
        },
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      // بدون صورة
      const result = await db.query(
        `INSERT INTO products (name, description, price, stock, image_url, category_id)
          VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, description, price, stock, null, categoryId],
      );

      console.log(result);

      return res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. نجيب المنتج أول
    const productResult = await db.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult.rows[0];

    // 2. نحذف الصورة من Cloudinary إذا موجودة
    if (product.cloudinary_id) {
      await cloudinary.uploader.destroy(product.cloudinary_id);
    }

    // 3. نحذف من الداتابيز
    await db.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({ message: "Product and image deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE product
// const updateProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, price, stock, image_url } = req.body;

//     const result = await db.query(
//       `UPDATE products
//              SET name=$1, description=$2, price=$3, stock=$4, image_url=$5
//              WHERE id=$6
//              RETURNING *`,
//       [name, description, price, stock, image_url, id],
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Product not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category_id } = req.body;
    const categoryId = category_id || null;

    if (req.file) {
      const existing = await db.query(
        "SELECT cloudinary_id FROM products WHERE id = $1",
        [id],
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const oldCloudinaryId = existing.rows[0].cloudinary_id;

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "products" },
        async (error, result) => {
          if (error) {
            return res.status(500).json({ error: error.message });
          }

          if (oldCloudinaryId) {
            await cloudinary.uploader.destroy(oldCloudinaryId);
          }

          const resultDb = await db.query(
            `UPDATE products
             SET name=$1, description=$2, price=$3, stock=$4, image_url=$5, cloudinary_id=$6, category_id=$7
             WHERE id=$8
             RETURNING *`,
            [
              name,
              description,
              price,
              stock,
              result.secure_url,
              result.public_id,
              categoryId,
              id,
            ],
          );

          return res.json(resultDb.rows[0]);
        },
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      const result = await db.query(
        `UPDATE products
          SET name=$1, description=$2, price=$3, stock=$4, category_id=$5
          WHERE id=$6
         RETURNING *`,
        [name, description, price, stock, categoryId, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      return res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getProduct,
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
};
