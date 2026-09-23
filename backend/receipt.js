// The issued donation receipt, rendered as a printable page. Same layout and
// the same IRS Publication 1771 language as the paper form in
// frontend/print/donation-receipt.html — this one just arrives filled in.
//
// Printed from the browser (Ctrl+P → Save as PDF) so the server needs no
// headless Chrome.

const { esc } = require('./public-page');

const ORG = 'Tug Comanche Historical Rescue Foundation';
const EIN = '39-5018917';

const money = (n) => (n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');

// r: a receipt_requests row. site: APP_BASE_URL, for the crest image.
function receiptHtml(r, site) {
  const cash = r.gift_kind === 'cash';
  const box = (on) => `<span class="cb${on ? ' on' : ''}">${on ? '&#10003;' : ''}</span>`;
  const line = (v) => `<span class="v">${esc(v || '')}</span>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Donation receipt ${esc(r.receipt_no || '')} — ${esc(r.donor_name)}</title>
<style>
  @page { size: Letter; margin: 0; }
  body { margin: 0; background: #666; font-family: 'Source Sans 3', Arial, Helvetica, sans-serif; color: #000; }
  .page { width: 8.5in; min-height: 11in; box-sizing: border-box; padding: 0.6in 0.7in 0.55in; background: #fff; margin: 16px auto; font-size: 10.5pt; line-height: 1.4; display: flex; flex-direction: column; }
  .lh { display: flex; align-items: center; gap: 12pt; border-bottom: 2pt solid #d9422b; padding-bottom: 8pt; }
  .lh img { width: 0.85in; filter: grayscale(1); }
  .lh .org { font-size: 15pt; line-height: 1.05; font-weight: 600; }
  .lh .meta { font-size: 8.5pt; color: #333; margin-top: 3pt; }
  .lh .right { margin-left: auto; text-align: right; }
  .lh .right .t { font-size: 18pt; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
  .lh .right .f { font-size: 9.5pt; margin-top: 4pt; }
  .intro { margin: 12pt 0 8pt; }
  h2 { font-size: 11pt; margin: 12pt 0 5pt; border-bottom: 0.6pt solid #000; padding-bottom: 2pt; }
  .row { display: flex; gap: 12pt; align-items: baseline; margin: 6pt 0; }
  .row label { white-space: nowrap; font-weight: 600; }
  .v { border-bottom: 0.7pt solid #000; flex: 1; min-width: 1.2in; padding: 0 3pt 1pt; display: inline-block; }
  .cb { display: inline-block; width: 10pt; height: 10pt; border: 0.8pt solid #000; vertical-align: -1pt; margin-right: 5pt; text-align: center; line-height: 9pt; font-size: 9pt; }
  .opt { margin: 5pt 0; }
  .muted { color: #888; }
  .note { font-size: 8.8pt; color: #222; margin: 3pt 0 0 15pt; }
  .fine { font-size: 8.5pt; color: #222; margin-top: 6pt; }
  .sig { margin-top: auto; }
  .foot { border-top: 0.6pt solid #000; margin-top: 10pt; padding-top: 5pt; font-size: 8pt; color: #333; display: flex; justify-content: space-between; }
  .bar { max-width: 8.5in; margin: 16px auto -6px; font-family: Arial, sans-serif; color: #fff; font-size: 13px; display: flex; gap: 10px; align-items: center; }
  .bar button { font: inherit; padding: 7px 14px; border: 0; border-radius: 4px; background: #d9422b; color: #fff; cursor: pointer; }
  @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; } .bar { display: none; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Print / Save as PDF</button><span>Letter size, black &amp; white. The donor copy and the Foundation copy are the same page.</span></div>
<div class="page">
  <div class="lh">
    <img src="${site}/images/crest.png" alt="">
    <div>
      <div class="org">${ORG}</div>
      <div class="meta">Auburn, Washington &middot; EIN ${EIN} &middot; IRS Publication 78 listed &mdash; eligible to receive tax-deductible charitable contributions (deductibility code PC)</div>
    </div>
    <div class="right">
      <div class="t">Donation Receipt</div>
      <div class="f">Receipt No. <strong>${esc(r.receipt_no || '—')}</strong></div>
      <div class="f">Date issued <strong>${esc(day(r.issued_at) || day(new Date()))}</strong></div>
    </div>
  </div>

  <p class="intro">${ORG} gratefully acknowledges receipt of the contribution described below. This receipt is provided for the donor&rsquo;s tax records and serves as the contemporaneous written acknowledgment described in IRS Publication 1771.</p>

  <h2>Donor</h2>
  <div class="row"><label>Name</label>${line(r.donor_name)}</div>
  <div class="row"><label>Mailing address</label>${line(r.address)}</div>
  <div class="row"><label>Email</label>${line(r.email)}<label>Phone</label>${line(r.phone)}</div>

  <h2>Contribution</h2>
  <div class="row"><label>Date received</label><span class="v" style="flex:0 0 1.6in">${esc(day(r.received_on))}</span><label>Received by</label>${line(r.issuer_name)}</div>
  <div class="opt">${box(cash)}<strong>Cash / check / electronic</strong> &nbsp; Amount $ <span class="v" style="min-width:1.3in">${esc(cash ? money(r.amount) : '')}</span>
    &nbsp; Check no. <span class="v" style="min-width:1in">${esc(r.check_no)}</span> &nbsp; Method <span class="v" style="min-width:1.3in">${esc(r.method)}</span></div>
  <div class="opt">${box(!cash)}<strong>Non-cash (property, materials, equipment, services)</strong> &nbsp; Description:</div>
  <div class="v" style="display:block;width:100%;min-height:22pt">${esc(cash ? '' : r.description)}</div>
  <div class="note">For non-cash contributions the donor is responsible for determining fair market value; the Foundation describes the property only and does not assign a value. Donated services and use of property are generally not deductible.</div>
  <div class="opt" style="margin-top:8pt">${box(!!r.restricted_for)}<strong>Restricted</strong> &nbsp; Donor designates this gift for: <span class="v" style="min-width:3in">${esc(r.restricted_for)}</span></div>
  <div class="note">Unless restricted above, contributions are unrestricted and applied where most needed to preserve and operate Comanche.</div>

  <h2>Goods or services</h2>
  <div class="opt">${box(!r.goods)}No goods or services were provided by the Foundation in exchange for this contribution.</div>
  <div class="opt">${box(!!r.goods)}Goods or services were provided, described as: <span class="v" style="min-width:3.2in">${esc(r.goods ? r.goods_desc : '')}</span></div>
  <div class="row" style="margin-left:15pt"><label>Good-faith estimate of the value of goods or services provided</label><span class="v" style="flex:0 0 1.4in">${r.goods && r.goods_value != null ? '$' + esc(money(r.goods_value)) : ''}</span></div>
  <div class="fine">Only the portion of a contribution that exceeds the good-faith value of any goods or services received may be deductible. Donations to the Foundation are always voluntary and are never a condition of coming aboard or of any vessel service. Comanche is not a charter vessel and does not offer paid passenger service. Donors should consult their own tax advisor regarding deductibility and record-keeping requirements.</div>

  <div class="sig">
    <h2>Authorized acknowledgment</h2>
    <div class="row"><label>Authorized representative</label>${line(r.issuer_name)}<label>Title</label><span class="v" style="flex:0 0 1.6in">${esc(r.issuer_title)}</span></div>
    <div class="row" style="margin-top:14pt"><label>Signature</label><span class="v"></span><label>Date</label><span class="v" style="flex:0 0 1.6in">${esc(day(r.issued_at) || '')}</span></div>
    <div class="foot">
      <span>${ORG} &middot; tug202.org &middot; info@tug202.org</span>
      <span>Issued online &middot; reference ${esc(String(r.id))}</span>
    </div>
  </div>
</div></body></html>`;
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

module.exports = { receiptHtml, receiptText };
