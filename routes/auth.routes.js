const express = require("express");

const router = express.Router();

const {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestResetPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const { validateRegister } = require("../middlewares/validateRegister.js");

router.post("/register", validateRegister, register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/request-reset-password", requestResetPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
