const express = require("express");

const router = express.Router();

const {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestResetPassword,
  resetPassword
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/request-reset-password", requestResetPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
