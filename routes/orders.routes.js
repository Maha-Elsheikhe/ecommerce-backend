const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");

const {
  checkout,
  getMyOrders,
  getOrderDetails,
} = require("../controllers/orders.controller");

router.get("/", authenticate, getMyOrders);
router.get("/:id", authenticate, getOrderDetails);
router.post("/checkout", authenticate, checkout);


module.exports = router;
