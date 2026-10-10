const nodemailer = require('nodemailer');

let transporter = null;

// .env.example ships values like "your_email@gmail.com" — treat those as unset.
const isPlaceholder = (v) => !v || /^your[_-]/i.test(v) || /^your_.*@/i.test(v);

function isMailConfigured() {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;
  return !!EMAIL_HOST && !isPlaceholder(EMAIL_USER) && !isPlaceholder(EMAIL_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      // Gmail shows app passwords as "abcd efgh ijkl mnop"; spaces aren't part of it.
      pass: String(process.env.EMAIL_PASS).replace(/\s+/g, ''),
    },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html, attachments }) {
  const from = process.env.EMAIL_FROM || `FinanceHub <${process.env.EMAIL_USER}>`;
  try {
    return await getTransporter().sendMail({ from, to, subject, text, html, attachments });
  } catch (err) {
    // Surface the actual SMTP reason (e.g. "535 Username and Password not accepted").
    const hint = err.responseCode === 535 || /invalid login|not accepted/i.test(err.message)
      ? ' — check EMAIL_USER and EMAIL_PASS (Gmail needs an App Password, not your normal password)'
      : '';
    console.error(`[mailer] send failed: ${err.message}${hint}`);
    throw err;
  }
}

module.exports = { isMailConfigured, sendMail };
