function getPasswordError(password) {
  if (password === undefined || password === null || password === "") {
    return "Password is required.";
  }

  if (typeof password !== "string") {
    return "Password must be a string.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain an uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain a lowercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Password must contain a number.";
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    return "Password must contain a special character.";
  }

  return null;
}

function validateRegister(req, res, next) {
  const error = getPasswordError(req.body?.password);
  if (error) {
    return res.status(400).json({ message: error });
  }
  next();
}

module.exports = {
  validateRegister,
  getPasswordError,
};
