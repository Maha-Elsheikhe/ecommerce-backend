const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

// routes

const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/auth.routes");
const cartRoutes = require("./routes/cart.routes");
const ordersRoutes = require("./routes/orders.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const categoriesRoutes = require("./routes/categories.routes");
const couponsRoutes = require("./routes/coupons.routes");
const analyticsRoutes = require("./routes/analytics.routes");

app.use("/api/products", productsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/admin/analytics", analyticsRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
