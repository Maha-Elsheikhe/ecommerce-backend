const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require("../controllers/wishlist.controller");

router.post("/:productId", auth, addToWishlist);
router.get("/", auth, getWishlist);
router.delete("/:productId", auth, removeFromWishlist);

module.exports = router;
