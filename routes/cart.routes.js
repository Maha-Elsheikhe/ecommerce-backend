const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/auth.middleware");

const {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
} = require("../controllers/cart.controller");

router.post("/", authenticate, addToCart);

router.get("/", authenticate, getCart);

router.put("/:id", authenticate, updateCartItem);

router.delete("/:id", authenticate, deleteCartItem);

module.exports = router;
