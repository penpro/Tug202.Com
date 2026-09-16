const nodemailer = require('nodemailer');

// Sends a plain-text notification to NOTIFY_EMAIL. With no SMTP_HOST set the
// message is logged instead, so the forms work end-to-end before mail is
// configured. Failures never bubble up to the request — the DB row is the
// source of truth and mail is best-effort.
let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

async function notify(subject, text, replyTo) {
  const to = (process.env.NOTIFY_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  const from = process.env.SMTP_FROM || 'no-reply@tug202.org';
  if (!transport || to.length === 0) {
    console.log(`[mail:skipped] to=${to.join(',') || '(none)'} subject=${subject}\n${text}`);
    return;
  }
  try {
    await transport.sendMail({ from, to, subject, text, replyTo });
  } catch (err) {
    console.error('[mail:error]', err.message);
  }
}

module.exports = { notify };
