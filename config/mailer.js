// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

// module.exports = transporter;

const nodemailer = require("nodemailer");
const dns = require("dns");

// Keep the IPv4 fix
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587, // Change this to 587
  secure: false, // Must be false when using 587 (it upgrades to secure automatically)
  requireTLS: true, // Force TLS connection
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Add these timeout settings (gives Render 20 seconds to connect)
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

module.exports = transporter;