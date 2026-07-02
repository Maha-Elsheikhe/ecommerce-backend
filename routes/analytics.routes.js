const express = require("express");
const router = express.Router();

const { getAnalytics } = require("../controllers/analytics.controller");
const authenticate = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");

router.get("/", authenticate, isAdmin, getAnalytics);

module.exports = router;
