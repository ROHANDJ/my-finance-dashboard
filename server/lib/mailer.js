const nodemailer = require('nodemailer');

let transporter = null;

function isMailConfigured() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || `FinanceHub <${process.env.EMAIL_USER}>`;
  return getTransporter().sendMail({ from, to, subject, text, html });
}

module.exports = { isMailConfigured, sendMail };
