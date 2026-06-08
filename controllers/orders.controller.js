const db = require("../db");

const checkout = async (req, res) => {
  const client = await db.connect();

  try {
    const userId = req.user.id;

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
            JOIN products p
                ON p.id = c.product_id
            WHERE c.user_id = $1
            `,
      [userId],
    );

    const cartItems = cartResult.rows;

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
    const userId = req.user.id;

    const result = db.query(
      `SELECT 
        id,
        total_price,
        status,
        created_at,

        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC 
      `,
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

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const orderResult = await db.query(
      `
            SELECT
                id,
                total_price,
                status,
                created_at

            FROM orders

            WHERE id = $1
            AND user_id = $2
            `,
      [id, userId],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const itemsResult = await db.query(
      `
            SELECT
                oi.product_id,
                p.name,
                oi.quantity,
                oi.unit_price

            FROM order_items oi

            JOIN products p
            ON p.id = oi.product_id

            WHERE oi.order_id = $1
            `,
      [id],
    );

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderDetails,
};
