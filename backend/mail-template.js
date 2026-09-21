// Branded email rendering. Authors write plain text; this turns it into a
// table-based HTML email (what mail clients actually render reliably) plus a
// text alternative.
//
// Body syntax (deliberately tiny):
//   blank line          -> new paragraph
//   **bold**            -> bold
//   [label](https://…)  -> link; bare https:// URLs are linked too
//   lines starting "- " -> bullet list
//   {{first_name}} {{name}} {{email}} {{unsubscribe_url}} -> merge fields;
//   {{first_name|there}} gives a fallback when the name is blank.

const crypto = require('crypto');

const SITE = () => (process.env.APP_BASE_URL || 'https://tug202.org').replace(/\/$/, '');
const ORG = 'Tug Comanche Historical Rescue Foundation';
const WHY = 'You are receiving this because you signed up for updates about the historic tug Comanche (ATA-202 / WMEC-202) at an event, on a boarding sheet, or on our website.';

// Curated hero images (basenames under /images, jpg). 'auto' picks one
// deterministically per blast so preview and send match.
const HERO_POOL = ['hero-port-dazzle', 'starboard-cg-stripe', 'bow-flag', 'overhead-raft', 'deck-crew', 'port-townsend-raftup',
  'crew-foredeck', 'underway-quarter', 'narrows-fog', 'at-the-pier', 'oly-rainbow', 'dockside-visitors', 'historic-coast-guard', 'comanche-moored'];
function resolveImage(blast) {
  const img = blast.image;
  if (!img) return null;
  if (img !== 'auto') return img;
  const seed = blast.id || [...String(blast.subject || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return HERO_POOL[seed % HERO_POOL.length];
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- unsubscribe tokens (HMAC of the address; no DB row needed) ------------
function unsubToken(email) {
  const e = email.trim().toLowerCase();
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev').update(e).digest('base64url').slice(0, 24);
  return Buffer.from(e).toString('base64url') + '.' + sig;
}
function verifyUnsubToken(t) {
  const [b, sig] = String(t || '').split('.');
  if (!b || !sig) return null;
  let e; try { e = Buffer.from(b, 'base64url').toString('utf8'); } catch { return null; }
  return unsubToken(e).split('.')[1] === sig ? e : null;
}
const unsubUrl = (email) => `${SITE()}/api/unsubscribe?t=${unsubToken(email)}`;

// ---- merge fields -----------------------------------------------------------
function merge(s, r) {
  const first = (r.name || '').trim().split(/\s+/)[0] || '';
  return String(s).replace(/\{\{\s*(\w+)(?:\|([^}]*))?\s*\}\}/g, (_, k, fb) => {
    const v = { first_name: first, name: (r.name || '').trim(), email: r.email, unsubscribe_url: unsubUrl(r.email) }[k];
    return v || fb || '';
  });
}

// ---- inline markup -> html --------------------------------------------------
function inline(s) {
  let h = esc(s);
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#1d4278">${t}</a>`);
  h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, p, u) => `${p}<a href="${u}" style="color:#1d4278">${u}</a>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return h;
}

function bodyHtml(text) {
  const P = 'margin:0 0 14px;font-size:16px;line-height:1.55;color:#1a1f2b;font-family:Georgia,\'Times New Roman\',serif';
  return text.replace(/\r/g, '').split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*-\s+/.test(l))) {
      return `<ul style="${P};padding-left:22px">` + lines.map(l => `<li style="margin-bottom:6px">${inline(l.replace(/^\s*-\s+/, ''))}</li>`).join('') + '</ul>';
    }
    return `<p style="${P}">${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}

function bodyText(text) {
  return text.replace(/\r/g, '').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1');
}

// ---- full message -----------------------------------------------------------
// blast: { subject, preheader, body, image }; r: { email, name }
function render(blast, r) {
  const subject = merge(blast.subject, r);
  const pre = merge(blast.preheader || '', r);
  const body = merge(blast.body, r);
  const unsub = unsubUrl(r.email);
  const site = SITE();
  const image = resolveImage(blast);
  const hero = image ? `<tr><td style="padding:0"><img src="${site}/images/${esc(image)}.jpg" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ece5d6">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(pre)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece5d6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fffdf8;border-top:5px solid #d9422b">
  <tr><td style="background:#0b1f3a;padding:18px 28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px"><img src="${site}/images/crest.png" width="48" height="48" alt="" style="display:block;border:0"></td>
      <td style="font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:18px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;line-height:1.1">Tug Comanche<br><span style="font-size:11px;font-weight:normal;letter-spacing:.12em;color:#c9a44c">ATA-202 &middot; WMEC-202</span></td>
    </tr></table>
  </td></tr>
  ${hero}
  <tr><td style="padding:28px 28px 8px">${bodyHtml(body)}</td></tr>
  <tr><td style="padding:8px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7a8190;border-top:1px solid #e6e0d3">
    <p style="margin:14px 0 8px">${esc(WHY)}</p>
    <p style="margin:0 0 8px"><a href="${unsub}" style="color:#7a8190">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="${site}" style="color:#7a8190">tug202.org</a> &nbsp;&middot;&nbsp; <a href="${site}/support" style="color:#7a8190">Support the ship</a></p>
    <p style="margin:0">${ORG} &middot; Washington 501(c)(3) &middot; EIN 39-5018917 &middot; Auburn, Washington</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = `${bodyText(body)}\n\n--\n${WHY}\nUnsubscribe: ${unsub}\n${ORG} · tug202.org · EIN 39-5018917 · Auburn, Washington\n`;

  return { subject, html, text, unsub };
}

module.exports = { render, merge, unsubToken, verifyUnsubToken, unsubUrl, HERO_POOL, resolveImage };
