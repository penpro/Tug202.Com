// The covering email for an issued receipt, plus its plain-text alternative.
// The receipt document itself is the PDF from receipt-pdf.js; this is the note
// it travels with.

const { esc } = require('./public-page');

const ORG = 'Tug Comanche Historical Rescue Foundation';
const EIN = '39-5018917';

const money = (n) => (n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');

// The covering note. Mail clients strip flexbox, CSS grid and @media rules,
// so this is plain nested tables with inline styles — the receipt itself
// travels as the attached PDF, where the layout is guaranteed.
function receiptEmailHtml(r, site) {
  const cash = r.gift_kind === 'cash';
  const rows = [
    ['Receipt number', r.receipt_no || ''],
    ['Date of gift', day(r.received_on)],
    cash ? ['Amount', '$' + money(r.amount)] : ['Donated', r.description],
    r.restricted_for ? ['Designated for', r.restricted_for] : null,
    ['Goods or services received', r.goods ? `${r.goods_desc} (good-faith value $${money(r.goods_value)})` : 'None']
  ].filter(Boolean);

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your donation receipt</title></head>
<body style="margin:0;padding:0;background:#ece5d6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece5d6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fffdf8;border-top:5px solid #d9422b">
  <tr><td style="background:#0b1f3a;padding:18px 28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px"><img src="${site}/images/crest.png" width="48" height="48" alt="" style="display:block;border:0"></td>
      <td style="font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:18px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;line-height:1.1">Tug Comanche<br><span style="font-size:11px;font-weight:normal;letter-spacing:.12em;color:#c9a44c">ATA-202 &middot; WMEC-202</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:26px 28px 6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#1a1f2b">
    <p style="margin:0 0 14px">${esc(r.donor_name)},</p>
    <p style="margin:0 0 14px">Thank you. Your donation receipt is attached as a PDF &mdash; please keep it with your tax records.</p>
  </td></tr>
  <tr><td style="padding:0 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e0d3;background:#fff">
      ${rows.map(([k, v]) => `<tr>
        <td style="padding:9px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#7a8190;border-bottom:1px solid #f0ebe0;width:45%">${esc(k)}</td>
        <td style="padding:9px 14px;font-family:Georgia,serif;font-size:15px;color:#1a1f2b;border-bottom:1px solid #f0ebe0"><strong>${esc(v)}</strong></td>
      </tr>`).join('')}
    </table>
  </td></tr>
  <tr><td style="padding:18px 28px 6px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;color:#1a1f2b">
    <p style="margin:0 0 14px">${ORG} is a Washington 501(c)(3), EIN ${EIN}. This is the contemporaneous written acknowledgment described in IRS Publication 1771${r.goods ? '; only the portion of your gift above the value shown above may be deductible' : ', and no goods or services were provided in exchange for your gift'}.</p>
    <p style="margin:0 0 6px">${esc(r.issuer_name)}${r.issuer_title ? ', ' + esc(r.issuer_title) : ''}</p>
  </td></tr>
  <tr><td style="padding:8px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7a8190;border-top:1px solid #e6e0d3">
    <p style="margin:14px 0 8px">You are receiving this because you asked us for a receipt. It is not a mailing-list message.</p>
    <p style="margin:0">${ORG} &middot; <a href="${site}" style="color:#7a8190">tug202.org</a> &middot; Auburn, Washington</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// Plain-text version, for emailing the donor.
function receiptText(r) {
  const cash = r.gift_kind === 'cash';
  return [
    `${ORG} — DONATION RECEIPT`,
    `Receipt No. ${r.receipt_no || ''}   Issued ${day(r.issued_at) || day(new Date())}`,
    `EIN ${EIN} · Auburn, Washington`,
    '',
    `Donor: ${r.donor_name}`,
    r.address && `Address: ${r.address}`,
    `Email: ${r.email}`,
    '',
    `Date received: ${day(r.received_on)}`,
    cash ? `Amount: $${money(r.amount)}${r.method ? ` (${r.method}${r.check_no ? ` no. ${r.check_no}` : ''})` : ''}`
         : `Non-cash contribution: ${r.description}`,
    r.restricted_for ? `Restricted for: ${r.restricted_for}` : 'Unrestricted — applied where most needed.',
    '',
    r.goods
      ? `Goods or services provided: ${r.goods_desc}. Good-faith value: $${money(r.goods_value)}. Only the portion of your contribution above that value may be deductible.`
      : 'No goods or services were provided in exchange for this contribution.',
    '',
    'This is the contemporaneous written acknowledgment described in IRS Publication 1771. Please keep it with your tax records; consult your own tax advisor regarding deductibility.',
    '',
    `${r.issuer_name}${r.issuer_title ? ', ' + r.issuer_title : ''}`,
    `${ORG} · tug202.org`
  ].filter(Boolean).join('\n');
}

module.exports = { receiptEmailHtml, receiptText };
