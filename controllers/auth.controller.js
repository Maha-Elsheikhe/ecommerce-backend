const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
// const nodemailer = require("nodemailer");
// const transporter = require("../config/mailer");
const resend = require("../config/mailer");
const { getPasswordError } = require("../middlewares/validateRegister");

// Same response for new and already-registered emails to prevent account enumeration.
const REGISTER_OK_RESPONSE = {
  message:
    "Registration successful. Please check your email to verify your account.",
  verificationEmailSent: true,
};
const RESEND_OK_RESPONSE = {
  message:
    "If an unverified account exists for this email, a verification email has been sent.",
};
const RESET_OK_RESPONSE = {
  message: "If an account exists for this email, a reset email has been sent.",
};

const register = async (req, res) => {
  try {
    const { fname, lname, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!fname || !lname || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // check existing user
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(201).json(REGISTER_OK_RESPONSE);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Verification tokens are single use and expire after 24 hours.
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // insert user
    const result = await db.query(
      `INSERT INTO users
        (fname, lname, email, password_hash, verification_token, verification_token_expires)
        VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '24 hours')
        RETURNING id,fname,lname,email,role`,
      [fname, lname, email, passwordHash, verificationToken],
    );

    const user = result.rows[0];

    // frontend link (recommended)
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    let verificationEmailSent = false;
    try {
      // await transporter.sendMail({
      //   from: process.env.EMAIL,
      //   to: email,
      //   subject: "Verify your email",
      //   html: `
      //   <h2>Welcome ${fname}!</h2>
      //   <p>Please verify your email:</p>
      //   <a href="${verificationLink}">Verify Email</a>
      // `,
      // });
      // console.log("EMAIL SENT SUCCESS");
      const emailResult = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: [email],
        subject: "Verify your email",
        html: `
          <h2>Welcome ${fname}!</h2>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationLink}">Verify Email</a>
        `,
      });
      if (emailResult?.error) {
        throw new Error("Email provider rejected the verification email");
      }
      verificationEmailSent = true;
    } catch (error) {
      // Keep the pending account and token so the user can request another email.
      console.error("Failed to send verification email:", error.message);
    }

    res.status(201).json({
      message: verificationEmailSent
        ? "Registration successful. Please check your email to verify your account."
        : "Account created. Verification email could not be sent; please request another email.",
      verificationEmailSent,
    });
  } catch (err) {
    if (err.code === "23505") {
      // Concurrent registration with the same email.
      return res.status(201).json(REGISTER_OK_RESPONSE);
    }
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const password = req.body.password;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // IMPORTANT: check verification AFTER password check
    if (!user.is_verified) {
      return res.status(403).json({
        message: "Please verify your email first.",
        email: user.email,
        needsVerification: true,
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({ message: "Authentication is not configured" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// verify email (FRONTEND sends request to backend)
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        message: "Token is required",
      });
    }

    const result = await db.query(
      `UPDATE users
        SET is_verified = true,
          verification_token = NULL,
          verification_token_expires = NULL
        WHERE verification_token = $1
          AND verification_token_expires > NOW()
          AND is_verified = false
        RETURNING id`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid, expired, or already used verification token",
      });
    }

    res.json({
      message: "Email verified successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0 || result.rows[0].is_verified) {
      return res.json(RESEND_OK_RESPONSE);
    }

    const user = result.rows[0];

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await db.query(
      `UPDATE users
        SET verification_token = $1,
          verification_token_expires = NOW() + INTERVAL '24 hours'
        WHERE id = $2`,
      [verificationToken, user.id],
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    try {
      const emailResult = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: [email],
        subject: "Verify your email",
        html: `
          <h2>Verify your email</h2>
          <p>Please click the link below to verify your account:</p>
          <a href="${verificationLink}">Verify Email</a>
        `,
      });
      if (emailResult?.error) {
        throw new Error("Email provider rejected the verification email");
      }
    } catch (error) {
      // Do not reveal (via a different status) that the account exists.
      console.error("Failed to resend verification email:", error.message);
    }

    res.json(RESEND_OK_RESPONSE);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to send email",
    });
  }
};

const requestResetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await db.query(
      "SELECT id, fname FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.json(RESET_OK_RESPONSE);
    }

    const user = result.rows[0];

    const resetToken = crypto.randomBytes(32).toString("hex");

    await db.query(
      `UPDATE users
        SET reset_password_token = $1,
          reset_password_expires = NOW() + INTERVAL '1 hour'
        WHERE id = $2`,
      [resetToken, user.id],
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      const emailResult = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: [email],
        subject: "Reset your password",
        html: `
    <h2>Password Reset</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">Reset Password</a>
  `,
      });
      if (emailResult?.error) {
        throw new Error("Email provider rejected the password reset email");
      }
    } catch (mailErr) {
      // Same response either way, so account existence is not revealed.
      console.error("Failed to send reset email:", mailErr.message);
    }

    res.json(RESET_OK_RESPONSE);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to process request",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Missing data" });
    }

    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const result = await db.query(
      `SELECT id
        FROM users
        WHERE reset_password_token = $1
        AND reset_password_expires > NOW()`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = result.rows[0];

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateResult = await db.query(
      `UPDATE users
        SET
        password_hash = $1,
        reset_password_token = NULL,
        reset_password_expires = NULL
        WHERE id = $2
          AND reset_password_token = $3
          AND reset_password_expires > NOW()
        RETURNING id`,
      [hashedPassword, user.id, token],
    );

    if (updateResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestResetPassword,
  resetPassword,
};
