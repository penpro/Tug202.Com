const nodemailer = require('nodemailer');

// Outbound mail. Backend is chosen from .env, in order:
//   SES_REGION set          -> Amazon SES (creds from the EC2 instance role; no secrets in .env)
//   else SMTP_HOST set      -> plain SMTP (nodemailer)
//   else                    -> log to the PM2 console and pretend it went out
// Submissions are always saved to MySQL first; mail is best-effort.

const from = () => process.env.SMTP_FROM || '"Tug Comanche Foundation" <no-reply@tug202.org>';

let backend = null;
if (process.env.SES_REGION) {
  const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
  const ses = new SESv2Client({ region: process.env.SES_REGION });
  backend = {
    name: 'ses',
    async deliver({ to, subject, text, replyTo }) {
      await ses.send(new SendEmailCommand({
        FromEmailAddress: from(),
        Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        Content: { Simple: { Subject: { Data: subject, Charset: 'UTF-8' }, Body: { Text: { Data: text, Charset: 'UTF-8' } } } }
      }));
    }
  };
} else if (process.env.SMTP_HOST) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  backend = { name: 'smtp', deliver: ({ to, subject, text, replyTo }) => transport.sendMail({ from: from(), to, subject, text, replyTo }) };
}

// Notification to the board (NOTIFY_EMAIL, comma-separated). Never throws.
async function notify(subject, text, replyTo) {
  const to = (process.env.NOTIFY_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!backend || to.length === 0) {
    console.log(`[mail:skipped] to=${to.join(',') || '(none)'} subject=${subject}\n${text}`);
    return;
  }
  try { await backend.deliver({ to, subject, text, replyTo }); }
  catch (err) { console.error('[mail:error]', err.message); }
}

// Direct mail to one recipient (invites, resets). Returns true only if it
// actually went out; false means the caller must hand the content over some
// other way (the UI shows the link).
async function send(to, subject, text) {
  if (!backend) { console.log(`[mail:skipped] to=${to} subject=${subject}`); return false; }
  try { await backend.deliver({ to, subject, text }); return true; }
  catch (err) { console.error('[mail:error]', err.message); return false; }
}

module.exports = { notify, send, backendName: backend?.name || 'none' };
