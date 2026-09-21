#!/usr/bin/env node
// Send one test email using the SMTP settings in .env and report the result.
//   node scripts/test-mail.js you@example.com
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { send, backendName } = require('../mailer');

const to = process.argv[2] || process.env.NOTIFY_EMAIL;
if (!to) { console.error('usage: test-mail.js <recipient>'); process.exit(1); }
if (backendName === 'none') { console.error('No mail backend: set SES_REGION or SMTP_HOST in .env'); process.exit(1); }
console.log(`backend: ${backendName}, from: ${process.env.SMTP_FROM || '(default no-reply@tug202.org)'}`);

send(to, 'tug202.org mail test', `If you can read this, outbound mail from the tug202.org server works.\n\nSent ${new Date().toISOString()} via ${backendName}.`)
  .then(ok => { console.log(ok ? `sent to ${to} — check the inbox (and spam, the first time)` : 'NOT sent — see error above'); process.exit(ok ? 0 : 1); });
