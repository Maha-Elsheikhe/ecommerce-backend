const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const transporter = require("../config/mailer");

const register = async (req, res) => {
  try {
    const { fname, lname, email, password } = req.body;

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
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // generate token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // insert user
    const result = await db.query(
      `INSERT INTO users
        (fname, lname, email, password_hash, verification_token)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING id,fname,lname,email,role`,
      [fname, lname, email, passwordHash, verificationToken],
    );

    const user = result.rows[0];

    // frontend link (recommended)
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    console.log("Sending email to:", email);
    console.log("FROM:", process.env.EMAIL);

    // email sender

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "Verify your email",
        html: `
        <h2>Welcome ${fname}!</h2>
        <p>Please verify your email:</p>
        <a href="${verificationLink}">Verify Email</a>
      `,
      });
      console.log("EMAIL SENT SUCCESS");
    } catch (e) {
      console.log("EMAIL ERROR FULL:", e);
      return res.status(500).json({ message: "Email sending failed" });
    }

    console.log("email sent ok");

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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
      error: err.message,
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
      `SELECT id, is_verified FROM users WHERE verification_token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.json({
        message: "Email already verified.",
      });
    }

    await db.query(
      `UPDATE users
        SET is_verified = true,
          verification_token = NULL
        WHERE id = $1`,
      [result.rows[0].id],
    );

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        message: "Email is already verified.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await db.query(
      `UPDATE users
        SET verification_token = $1
        WHERE id = $2`,
      [verificationToken, user.id],
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await transporter
      .sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: "Verify your email",
        html: `
        <h2>Hello ${user.fname}</h2>
        <p>Click the button below to verify your email.</p>

        <a href="${verificationLink}">
          Verify Email
        </a>
      `,
      })
      .then((info) => console.log("Email sent:", info.response))
      .catch((err) => console.log("EMAIL ERROR:", err));

    console.log("EMAIL:", process.env.EMAIL);
    console.log("EMAIL_PASSWORD exists:", !!process.env.EMAIL_PASSWORD);

    transporter.verify((error, success) => {
      if (error) {
        console.error(error);
      } else {
        console.log("SMTP Server is ready");
      }
    });

    res.json({
      message: "Verification email sent successfully.",
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const requestResetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await db.query(
      "SELECT id, fname FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
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

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Reset Password",
      html: `
        <h2>Hello ${user.fname}</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
      `,
    });

    res.json({ message: "Reset email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Missing data" });
    }

    const result = await db.query(
      `SELECT id
        FROM users
        WHERE reset_password_token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = result.rows[0];

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users
        SET password_hash = $1,
        reset_password_token = NULL
        WHERE id = $2`,
      [hashedPassword, user.id],
    );

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
