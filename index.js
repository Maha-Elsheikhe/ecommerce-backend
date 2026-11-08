const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
require("dotenv").config();

const app = express();
app.disable("x-powered-by");
// Render (and most hosts) sit behind one reverse proxy; needed for correct client IPs.
app.set("trust proxy", 1);
app.use(helmet());

const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header include server-to-server and health checks.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);

app.use(express.json());

const limiterOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
};
// General API limit, plus a much stricter one for authentication endpoints.
app.use("/api", rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 300 }));
const authLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 20 });

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
app.use("/api/auth", authLimiter, authRoutes);
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

// JSON error handler (malformed JSON, upload errors) - never leaks stack traces.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
