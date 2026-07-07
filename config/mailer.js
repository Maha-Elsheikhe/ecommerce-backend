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

// const nodemailer = require("nodemailer");
// const dns = require("dns");

// // 1. Force Node to use IPv4. This stops the "ENETUNREACH" IPv6 error on Render.
// dns.setDefaultResultOrder("ipv4first");

// const transporter = nodemailer.createTransport({
//   // Notice: service: "gmail" is completely removed so it doesn't override our settings
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // MUST be false for port 587 (it upgrades to secure via STARTTLS)
//   requireTLS: true, // Forces the secure connection Gmail requires
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_PASSWORD, // Must be your 16-character App Password
//   },
//   // 2. Gives Render's free tier enough time to make the connection without timing out
//   connectionTimeout: 20000,
//   greetingTimeout: 20000,
//   socketTimeout: 20000,
// });

// module.exports = transporter;

const { Resend } = require("resend");

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;