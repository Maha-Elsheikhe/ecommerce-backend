const db = require("../db");

const checkout = async (req, res) => {
  const client = await db.connect();
  console.log(req.user.id);
  try {
    const userId = req.user.id;
    const { couponCode } = req.body;

    await client.query("BEGIN");

    // 1. جلب محتويات السلة
    const cartResult = await client.query(
      `
            SELECT
                c.product_id,
                c.quantity,
                p.price,
                p.stock
            FROM cart c
            LEFT JOIN products p
                ON p.id = c.product_id
            WHERE c.user_id = $1
            `,
      [userId],
    );

    const cartItems = cartResult.rows;
    console.log("Cart Items:", cartItems);

    // 2. التأكد أن السلة ليست فارغة
    if (cartItems.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    // 3. التحقق من المخزون وحساب المجموع
    let totalPrice = 0;

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Not enough stock for product ${item.product_id}`,
        });
      }

      totalPrice += Number(item.price) * item.quantity;
    }

    if (couponCode) {
      const couponResult = await client.query(
        `
    SELECT *
    FROM coupons
    WHERE code = $1
    `,
        [couponCode.toUpperCase()],
      );

      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0];

        if (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) {
          const discount = (totalPrice * coupon.discount_percent) / 100;

          totalPrice -= discount;
        }
      }
    }

    // 4. إنشاء الطلب
    const orderResult = await client.query(
      `
            INSERT INTO orders
            (
                user_id,
                total_price
            )
            VALUES ($1,$2)
            RETURNING *
            `,
      [userId, totalPrice],
    );

    const orderId = orderResult.rows[0].id;

    // 5. إنشاء order items
    for (const item of cartItems) {
      await client.query(
        `
                INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    quantity,
                    unit_price
                )
                VALUES ($1,$2,$3,$4)
                `,
        [orderId, item.product_id, item.quantity, item.price],
      );

      // 6. خصم المخزون
      await client.query(
        `
                UPDATE products
                SET stock = stock - $1
                WHERE id = $2
                `,
        [item.quantity, item.product_id],
      );
    }

    // 7. حذف السلة
    await client.query(
      `
            DELETE FROM cart
            WHERE user_id = $1
            `,
      [userId],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order created successfully",
      orderId,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  } finally {
    client.release();
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    let result;

    if (role === "admin") {
      result = await db.query(
        `SELECT
          id,
          user_id,
          total_price,
          status,
          created_at
        FROM orders
        ORDER BY created_at DESC`,
      );
    } else {
      result = await db.query(
        `SELECT
          id,
          total_price,
          status,
          created_at
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC`,
        [userId],
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    let orderResult;

    if (role === "admin") {
      orderResult = await db.query(
        `SELECT
          o.id,
          o.total_price,
          o.status,
          o.created_at,
          u.id AS user_id,
          u.fname,
          u.lname,
          u.email
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
        [id],
      );
    } else {
      orderResult = await db.query(
        `SELECT
          id,
          total_price,
          status,
          created_at
        FROM orders
        WHERE id = $1
        AND user_id = $2`,
        [id, userId],
      );
    }

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const itemsResult = await db.query(
      `SELECT
        oi.product_id,
        p.name,
        oi.quantity,
        oi.unit_price
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1`,
      [id],
    );

    const response = { order: orderResult.rows[0], items: itemsResult.rows };

    if (role === "admin") {
      const { user_id, fname, lname, email, ...order } = orderResult.rows[0];
      response.order = order;
      response.user = { id: user_id, fname, lname, email };
    }

    res.json(response);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const orderResult = await db.query(
      `
      SELECT *
      FROM orders
      WHERE id = $1
      `,
      [id],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const currentStatus = orderResult.rows[0].status;

    const transitions = {
      pending: ["paid", "cancelled"],
      paid: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!transitions[currentStatus].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${currentStatus} to ${status}`,
      });
    }

    await db.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      `,
      [status, id],
    );

    res.json({
      message: "Order status updated",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderDetails,
  updateOrderStatus,
};
