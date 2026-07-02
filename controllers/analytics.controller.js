const db = require("../db");

const getAnalytics = async (req, res) => {
  try {
    // 1. Users
    const usersResult = await db.query("SELECT COUNT(*) FROM users");
    const totalUsers = Number(usersResult.rows[0].count);

    // 2. Products
    const productsResult = await db.query("SELECT COUNT(*) FROM products");
    const totalProducts = Number(productsResult.rows[0].count);

    // 3. Orders
    const ordersResult = await db.query("SELECT COUNT(*) FROM orders");
    const totalOrders = Number(ordersResult.rows[0].count);

    // 4. Revenue (مهم)
    const revenueResult = await db.query(
      "SELECT COALESCE(SUM(total_price), 0) AS total FROM orders",
    );
    const totalRevenue = Number(revenueResult.rows[0].total);

    // 5. Order statuses
    const pendingResult = await db.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'pending'",
    );

    const completedResult = await db.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'completed'",
    );

    const cancelledResult = await db.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'cancelled'",
    );

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders: Number(pendingResult.rows[0].count),
      completedOrders: Number(completedResult.rows[0].count),
      cancelledOrders: Number(cancelledResult.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

module.exports = {
  getAnalytics,
};
