const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");

const {
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
} = require("../controllers/products.controller");

// GET all products
router.get("/", getProducts);

// ADD product
router.post("/", authenticate, isAdmin, addProduct);

// DELETE product
router.delete("/:id", authenticate, isAdmin, deleteProduct);

// UPDATE product
router.put("/:id", authenticate, isAdmin, updateProduct);

module.exports = router;
