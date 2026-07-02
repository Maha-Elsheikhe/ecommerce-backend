const db = require("../db");

const createCoupon = async (req, res) => {
  try {
    const { code, discount_percent, expires_at } = req.body;

    const result = await db.query(
      `
      INSERT INTO coupons
      (
        code,
        discount_percent,
        expires_at
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [code.toUpperCase(), discount_percent, expires_at],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const getCoupons = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM coupons
      ORDER BY created_at DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const result = await db.query(
      `
      SELECT *
      FROM coupons
      WHERE code = $1
      `,
      [code.toUpperCase()],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        message: "Coupon not found",
      });
    }

    const coupon = result.rows[0];

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({
        valid: false,
        message: "Coupon expired",
      });
    }

    res.json({
      valid: true,
      coupon,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `
      DELETE FROM coupons
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      message: "Coupon deleted",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  validateCoupon,
  deleteCoupon,
};