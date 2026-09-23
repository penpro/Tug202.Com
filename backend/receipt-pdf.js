// The issued donation receipt as a PDF, drawn with pdfkit — no headless
// browser, so it runs on the 1 GB server. Layout follows the paper form in
// frontend/print/donation-receipt.html: Letter, black and white, one page.

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ORG = 'Tug Comanche Historical Rescue Foundation';
const EIN = '39-5018917';
const CREST = path.join(__dirname, '..', 'frontend', 'public', 'images', 'crest.png');

const money = (n) => (n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');

// Letter at 72 dpi = 612 x 792. Margins match the paper form (0.7in / 0.6in).
const L = 50, R = 562, W = R - L;

function receiptPdf(r) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 43, bottom: 40, left: L, right: 50 } });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise(res => doc.on('end', () => res(Buffer.concat(chunks))));

  const cash = r.gift_kind === 'cash';

  // --- letterhead ---------------------------------------------------------
  let y = 43;
  try { if (fs.existsSync(CREST)) doc.image(CREST, L, y, { width: 52 }); } catch { /* crest optional */ }
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000').text(ORG, L + 64, y + 2, { width: 300 });
  doc.font('Helvetica').fontSize(6.6).fillColor('#333')
    .text(`Auburn, Washington  ·  EIN ${EIN}  ·  IRS Publication 78 listed — eligible to receive tax-deductible charitable contributions (deductibility code PC)`,
      L + 64, doc.y + 1, { width: 290 });

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text('DONATION RECEIPT', 372, y + 2, { width: 190, align: 'right' });
  doc.font('Helvetica').fontSize(8.5).fillColor('#000')
    .text(`Receipt No. ${r.receipt_no || '—'}`, 372, y + 24, { width: 190, align: 'right' })
    .text(`Date issued ${day(r.issued_at) || day(new Date())}`, 372, doc.y + 1, { width: 190, align: 'right' });

  y = Math.max(doc.y, y + 58) + 6;
  doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor('#d9422b').stroke();
  y += 12;

  // --- helpers ------------------------------------------------------------
  const para = (text, size = 8.6, color = '#222', gap = 3) => {
    doc.font('Helvetica').fontSize(size).fillColor(color).text(text, L, y, { width: W, align: 'left' });
    y = doc.y + gap;
  };
  const head = (t) => {
    y += 5;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text(t.toUpperCase(), L, y, { width: W, characterSpacing: 0.6 });
    y = doc.y + 2;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor('#000').stroke();
    y += 6;
  };
  // A labelled value on a ruled line, like the blanks on the paper form.
  const field = (label, value, x, width) => {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000').text(label, x, y, { width, lineBreak: false });
    const lw = doc.widthOfString(label) + 6;
    doc.font('Helvetica').fontSize(9).fillColor('#000').text(String(value || ''), x + lw, y, { width: width - lw - 2, lineBreak: false });
    doc.moveTo(x + lw, y + 11).lineTo(x + width, y + 11).lineWidth(0.6).strokeColor('#000').stroke();
  };
  const rowEnd = (h = 20) => { y += h; };
  const check = (on, text, size = 8.8) => {
    doc.rect(L + 1, y, 8, 8).lineWidth(0.8).strokeColor('#000').stroke();
    if (on) doc.font('Helvetica-Bold').fontSize(8).fillColor('#000').text('X', L + 2.6, y + 0.6, { lineBreak: false });
    doc.font('Helvetica').fontSize(size).fillColor('#000').text(text, L + 14, y - 0.5, { width: W - 14 });
    y = Math.max(doc.y, y + 10) + 3;
  };

  para(`${ORG} gratefully acknowledges receipt of the contribution described below. This receipt is provided for the donor's tax records and serves as the contemporaneous written acknowledgment described in IRS Publication 1771.`, 8.8, '#000', 6);

  // --- donor --------------------------------------------------------------
  head('Donor');
  field('Name', r.donor_name, L, W); rowEnd();
  field('Mailing address', r.address, L, W); rowEnd();
  field('Email', r.email, L, W / 2 - 6);
  field('Phone', r.phone, L + W / 2 + 6, W / 2 - 6); rowEnd();

  // --- contribution -------------------------------------------------------
  head('Contribution');
  field('Date received', day(r.received_on), L, 200);
  field('Received by', r.issuer_name, L + 212, W - 212); rowEnd();

  check(cash, '');
  y -= 13;
  doc.font('Helvetica-Bold').fontSize(8.8).text('Cash / check / electronic', L + 14, y, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.8)
    .text(`   Amount $ ${cash ? money(r.amount) : ''}`, L + 132, y, { lineBreak: false })
    .text(`   Check no. ${cash ? r.check_no || '' : ''}`, L + 235, y, { lineBreak: false })
    .text(`   Method ${cash ? r.method || '' : ''}`, L + 340, y, { lineBreak: false });
  y += 15;

  check(!cash, '');
  y -= 13;
  doc.font('Helvetica-Bold').fontSize(8.8).text('Non-cash (property, materials, equipment, services)', L + 14, y, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.8).text('   Description:', L + 250, y, { lineBreak: false });
  y += 15;
  doc.font('Helvetica').fontSize(9).fillColor('#000').text(cash ? '' : String(r.description || ''), L + 2, y, { width: W - 4 });
  const descBottom = Math.max(doc.y, y + 12);
  doc.moveTo(L, descBottom + 1).lineTo(R, descBottom + 1).lineWidth(0.6).strokeColor('#000').stroke();
  y = descBottom + 6;
  para('For non-cash contributions the donor is responsible for determining fair market value; the Foundation describes the property only and does not assign a value. Donated services and use of property are generally not deductible.', 7.6, '#333', 6);

  check(!!r.restricted_for, '');
  y -= 13;
  doc.font('Helvetica-Bold').fontSize(8.8).text('Restricted', L + 14, y, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.8).text(`   Donor designates this gift for: ${r.restricted_for || ''}`, L + 68, y, { lineBreak: false });
  y += 15;
  para('Unless restricted above, contributions are unrestricted and applied where most needed to preserve and operate Comanche.', 7.6, '#333', 4);

  // --- goods or services --------------------------------------------------
  head('Goods or services');
  check(!r.goods, 'No goods or services were provided by the Foundation in exchange for this contribution.');
  check(!!r.goods, `Goods or services were provided, described as: ${r.goods ? r.goods_desc || '' : ''}`);
  doc.font('Helvetica-Bold').fontSize(8.5).text('Good-faith estimate of the value of goods or services provided', L + 14, y, { lineBreak: false });
  doc.font('Helvetica').fontSize(9).text(r.goods && r.goods_value != null ? `  $${money(r.goods_value)}` : '', L + 320, y, { lineBreak: false });
  doc.moveTo(L + 320, y + 11).lineTo(L + 430, y + 11).lineWidth(0.6).stroke();
  y += 18;
  para("Only the portion of a contribution that exceeds the good-faith value of any goods or services received may be deductible. Donations to the Foundation are always voluntary and are never a condition of coming aboard or of any vessel service. Comanche is not a charter vessel and does not offer paid passenger service. Donors should consult their own tax advisor regarding deductibility and record-keeping requirements.", 7.4, '#222', 6);

  // --- acknowledgment (pinned to the bottom, like the paper form) ---------
  y = Math.max(y, 620);
  head('Authorized acknowledgment');
  field('Authorized representative', r.issuer_name, L, W - 200);
  field('Title', r.issuer_title, L + W - 190, 190); rowEnd(26);
  field('Signature', '', L, W - 200);
  field('Date', day(r.issued_at) || '', L + W - 190, 190); rowEnd(16);

  doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor('#000').stroke();
  y += 4;
  doc.font('Helvetica').fontSize(7).fillColor('#333')
    .text(`${ORG}  ·  tug202.org  ·  info@tug202.org`, L, y, { width: W / 2, lineBreak: false })
    .text(`Issued online  ·  reference ${r.id}`, L + W / 2, y, { width: W / 2, align: 'right', lineBreak: false });

  doc.end();
  return done;
}

module.exports = { receiptPdf };
