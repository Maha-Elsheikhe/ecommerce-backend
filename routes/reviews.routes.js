const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

const {
  addReview,
  getProductReviews,
  deleteReview,
} = require("../controllers/reviews.controller");

router.post("/:productId", auth, addReview);
router.get("/:productId", getProductReviews);
router.delete("/:id", auth, deleteReview);

module.exports = router;
