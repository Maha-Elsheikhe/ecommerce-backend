const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");

const {
  checkout,
  getMyOrders,
  getOrderDetails,
  updateOrderStatus,
} = require("../controllers/orders.controller");

router.get("/", authenticate, getMyOrders);
router.get("/:id", authenticate, getOrderDetails);
router.post("/checkout", authenticate, checkout);
router.patch("/:id/status", authenticate, isAdmin, updateOrderStatus);

module.exports = router;
