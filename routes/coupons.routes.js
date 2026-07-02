const express = require("express");
const authenticate = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");

const router = express.Router();

const {
  createCoupon,
  getCoupons,
  validateCoupon,
  deleteCoupon,
} = require("../controllers/coupons.controller.js");

router.post("/", authenticate, isAdmin, createCoupon);

router.get("/", authenticate, isAdmin, getCoupons);

router.post("/validate", authenticate, validateCoupon);

router.delete("/:id", authenticate, isAdmin, deleteCoupon);

module.exports = router;
