const nodemailer = require('nodemailer');

// Outbound mail. Backend is chosen from .env, in order:
//   SES_REGION set          -> Amazon SES (creds from the EC2 instance role; no secrets in .env)
//   else SMTP_HOST set      -> plain SMTP (nodemailer)
//   else                    -> log to the PM2 console and pretend it went out
// Submissions are always saved to MySQL first; mail is best-effort.

const from = () => process.env.SMTP_FROM || '"Tug Comanche Foundation" <no-reply@tug202.org>';

let backend = null;
let warnedSet = false;
if (process.env.SES_REGION) {
  const { SESv2Client, SendEmailCommand, ListSuppressedDestinationsCommand } = require('@aws-sdk/client-sesv2');
  const ses = new SESv2Client({ region: process.env.SES_REGION });
  backend = {
    name: 'ses',
    // requireTracking: blasts set this so a missing configuration set is an
    // error (they'd otherwise go out with bounce tracking silently off).
    async deliver({ to, subject, text, html, replyTo, headers, requireTracking }) {
      const params = (withSet) => ({
        FromEmailAddress: from(),
        Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        ConfigurationSetName: withSet && process.env.SES_CONFIG_SET ? process.env.SES_CONFIG_SET : undefined,
        Content: { Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' }, ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}) },
          Headers: headers ? Object.entries(headers).map(([Name, Value]) => ({ Name, Value })) : undefined
        } }
      });
      try {
        return (await ses.send(new SendEmailCommand(params(true)))).MessageId;
      } catch (err) {
        // SES_CONFIG_SET is pre-set before the set exists; degrade rather than fail.
        if (!/configuration set/i.test(err.message)) throw err;
        if (requireTracking) throw new Error(`SES configuration set '${process.env.SES_CONFIG_SET}' not found — bounce tracking would be off. Run ops/ses-bounce-setup.sh in CloudShell.`);
        if (!warnedSet) { console.warn('[mail] SES configuration set not found; sending without it (bounce tracking off)'); warnedSet = true; }
        return (await ses.send(new SendEmailCommand(params(false)))).MessageId;
      }
    },
    // SES's account-level suppression list: every address that hard-bounced or
    // complained, whether or not the SNS webhook saw it. Yields
    // { email, reason: 'BOUNCE'|'COMPLAINT', at: Date }. Needs
    // ses:ListSuppressedDestinations on the instance role.
    async *suppressed(since) {
      let NextToken;
      do {
        const out = await ses.send(new ListSuppressedDestinationsCommand({ StartDate: since || undefined, PageSize: 1000, NextToken }));
        for (const d of out.SuppressedDestinationSummaries || []) yield { email: d.EmailAddress.toLowerCase(), reason: d.Reason, at: d.LastUpdateTime };
        NextToken = out.NextToken;
      } while (NextToken);
    }
  };
} else if (process.env.SMTP_HOST) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  backend = { name: 'smtp', deliver: async ({ to, subject, text, html, replyTo, headers }) => (await transport.sendMail({ from: from(), to, subject, text, html, replyTo, headers })).messageId };
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

// Raw delivery for the blast sender: throws on failure, returns the message id.
async function deliver(msg) {
  if (!backend) throw new Error('No mail backend configured');
  return backend.deliver(msg);
}

module.exports = { notify, send, deliver, suppressed: backend?.suppressed, backendName: backend?.name || 'none' };
