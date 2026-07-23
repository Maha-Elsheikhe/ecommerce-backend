function validateRegister(req, res, next) {
  const { password } = req.body;

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters.",
    });
  }

  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({
      message: "Password must contain an uppercase letter.",
    });
  }

  if (!/[a-z]/.test(password)) {
    return res.status(400).json({
      message: "Password must contain a lowercase letter.",
    });
  }

  if (!/\d/.test(password)) {
    return res.status(400).json({
      message: "Password must contain a number.",
    });
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    return res.status(400).json({
      message: "Password must contain a special character.",
    });
  }

  next();
}

module.exports = {
  validateRegister,
};