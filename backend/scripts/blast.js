#!/usr/bin/env node
// Drive mail blasts from the server shell. Talks to the running backend on
// loopback with ADMIN_TOKEN from .env, so the send loop stays in one process.
//
//   node scripts/blast.js list
//   node scripts/blast.js status <id>
//   node scripts/blast.js send <id>                       # start now
//   node scripts/blast.js send <id> --at "2026-09-22 09:00" # schedule (server local time)
//   node scripts/blast.js send <id> --rate 20 --cap 180   # set pacing first (per minute / per day)
//   node scripts/blast.js pause|resume|unschedule <id>
//   node scripts/blast.js test <id> you@example.com
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE = `http://127.0.0.1:${process.env.PORT || 3202}/api/admin`;
const TOKEN = process.env.ADMIN_TOKEN;
if (!TOKEN) { console.error('ADMIN_TOKEN missing from .env'); process.exit(1); }

const [cmd, idArg, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
const id = Number(idArg);

async function call(path, method = 'GET', body) {
  const r = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `${r.status} ${r.statusText}`);
  return d;
}

const fmt = (b) => `#${b.id}  ${b.status.padEnd(9)} ${String(b.sent || 0).padStart(4)}/${String(b.total || 0).padEnd(4)} failed ${b.failed || 0}  ${b.rate_per_minute}/min cap ${b.daily_cap || '—'}${b.scheduled_at ? '  at ' + new Date(b.scheduled_at).toLocaleString() : ''}  ${b.subject}`;

(async () => {
  switch (cmd) {
    case 'list': { const { blasts } = await call('/blasts'); blasts.forEach(b => console.log(fmt(b))); break; }
    case 'status': {
      const b = await call(`/blasts/${id}`);
      console.log(fmt(b)); console.log('recipients by status:', b.byStatus, ' backend:', b.backend);
      break;
    }
    case 'send': {
      const rate = opt('rate'), cap = opt('cap');
      if (rate || cap) {
        const blast = await call(`/blasts/${id}`);
        await call(`/blasts/${id}`, 'PATCH', { ...blast, rate_per_minute: rate ? Number(rate) : blast.rate_per_minute, daily_cap: cap ? Number(cap) : blast.daily_cap });
      }
      const at = opt('at');
      const out = await call(`/blasts/${id}/send`, 'POST', at ? { scheduled_at: new Date(at).toISOString() } : {});
      console.log(out.scheduled_at ? `scheduled for ${new Date(out.scheduled_at).toLocaleString()}` : `sending to ${out.total} recipients`);
      break;
    }
    case 'pause': case 'resume': case 'unschedule': await call(`/blasts/${id}/${cmd}`, 'POST', {}); console.log(cmd + 'd'); break;
    case 'test': { const out = await call(`/blasts/${id}/test`, 'POST', { to: rest[0] }); console.log('test sent to', out.to || rest[0]); break; }
    default: console.error('usage: blast.js list | status <id> | send <id> [--at "YYYY-MM-DD HH:MM"] [--rate N] [--cap N] | pause|resume|unschedule <id> | test <id> <email>'); process.exit(1);
  }
})().catch(err => { console.error('error:', err.message); process.exit(1); });
