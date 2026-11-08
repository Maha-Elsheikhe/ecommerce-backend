const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");
const upload = require("../middlewares/upload");
const { validateProduct } = require("../middlewares/validateProduct");

const {
  getProduct,
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
} = require("../controllers/products.controller");
// GET single product
router.get("/:id", getProduct);

// GET all products
router.get("/", getProducts);

// ADD product
router.post(
  "/",
  authenticate,
  isAdmin,
  upload.single("image"),
  validateProduct,
  addProduct,
);

// DELETE product
router.delete("/:id", authenticate, isAdmin, deleteProduct);

// UPDATE product
router.put(
  "/:id",
  authenticate,
  isAdmin,
  upload.single("image"),
  validateProduct,
  updateProduct,
);

module.exports = router;
