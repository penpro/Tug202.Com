// The manifest: who is on board, by category, on one page you can hand to a
// boarding officer. Drawn with pdfkit so it works on the server.
//
// The number that matters is "souls on board" — it has to match what the
// master would report, and it is the number a life-jacket count is checked
// against. Passengers, crew and children are broken out because that is how
// the question gets asked.

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ORG = 'Tug Comanche Historical Rescue Foundation';
const VESSEL = 'M/V COMANCHE (ex-USCGC COMANCHE, WMEC-202)';
const CREST = path.join(__dirname, '..', 'frontend', 'public', 'images', 'crest.png');

const L = 50, R = 562, W = R - L;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');
const clock = (d) => (d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');

function manifestPdf(sailing, roster, counts, preparedBy) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 43, bottom: 44, left: L, right: 50 } });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise(res => doc.on('end', () => res(Buffer.concat(chunks))));

  const aboard = roster.filter(r => r.checked_in_at && !r.checked_out_at);
  const ashore = roster.filter(r => r.checked_out_at);
  const isCrew = (r) => r.role === 'crew' || r.role === 'volunteer';

  let y = 43;
  try { if (fs.existsSync(CREST)) doc.image(CREST, L, y, { width: 46 }); } catch { /* crest optional */ }
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#000').text('PASSENGER AND CREW MANIFEST', L + 58, y + 2);
  doc.font('Helvetica').fontSize(9).fillColor('#333')
    .text(VESSEL, L + 58, doc.y + 1)
    .text(`${ORG}  ·  Auburn, Washington`, L + 58, doc.y + 1);
  y = Math.max(doc.y, y + 46) + 6;
  doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor('#d9422b').stroke();
  y += 12;

  // --- the sailing --------------------------------------------------------
  const kv = (label, value, x, w) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#555').text(label.toUpperCase(), x, y, { width: w, characterSpacing: 0.4 });
    doc.font('Helvetica').fontSize(10.5).fillColor('#000').text(String(value || '—'), x, y + 10, { width: w });
  };
  kv('Date', day(sailing.sail_date), L, 200);
  kv('Sailing', sailing.title || 'Open ship', L + 210, 180);
  kv('Departing from', sailing.location || '—', L + 400, W - 400);
  y += 32;
  kv('Manifest prepared', new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), L, 240);
  kv('Prepared by', preparedBy || '—', L + 250, 160);
  kv('Status', sailing.status, L + 420, W - 420);
  y += 36;

  // --- the count ----------------------------------------------------------
  const cells = [
    ['PASSENGERS', counts.passengers, 'adults, 18 and over'],
    ['CHILDREN', counts.children, 'under 18, with a guardian'],
    ['CREW', counts.crew, 'incl. working volunteers'],
    ['SOULS ON BOARD', counts.aboard, 'total persons aboard']
  ];
  const cw = W / 4;
  doc.rect(L, y, W, 54).lineWidth(0.8).strokeColor('#000').stroke();
  cells.forEach(([label, n, note], i) => {
    const x = L + i * cw;
    if (i) doc.moveTo(x, y).lineTo(x, y + 54).lineWidth(0.6).strokeColor('#999').stroke();
    const bold = i === 3;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555').text(label, x + 6, y + 6, { width: cw - 12, align: 'center', characterSpacing: 0.5 });
    doc.font('Helvetica-Bold').fontSize(bold ? 25 : 21).fillColor(bold ? '#d9422b' : '#000').text(String(n), x + 6, y + 17, { width: cw - 12, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#666').text(note, x + 4, y + 44, { width: cw - 8, align: 'center' });
  });
  y += 62;
  if (sailing.capacity > 0) {
    doc.font('Helvetica').fontSize(8.5).fillColor(counts.aboard > sailing.capacity ? '#b8321f' : '#333')
      .text(`Stated capacity for this sailing: ${sailing.capacity}.${counts.aboard > sailing.capacity ? '  OVER CAPACITY.' : ''}`, L, y);
    y = doc.y + 6;
  }

  // --- the people ---------------------------------------------------------
  const header = (title, n) => {
    y += 6;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000').text(`${title} (${n})`, L, y);
    y = doc.y + 3;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor('#000').stroke();
    y += 5;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#555');
    doc.text('NAME', L, y, { width: 170, lineBreak: false });
    doc.text('ROLE', L + 175, y, { width: 55, lineBreak: false });
    doc.text('AD', L + 232, y, { width: 18, lineBreak: false });
    doc.text('CH', L + 252, y, { width: 18, lineBreak: false });
    doc.text('ABOARD', L + 274, y, { width: 46, lineBreak: false });
    doc.text('CHILDREN IN CARE / EMERGENCY CONTACT', L + 324, y, { width: W - 324, lineBreak: false });
    y += 10;
  };

  const line = (r) => {
    if (y > 690) { doc.addPage(); y = 50; }
    doc.font('Helvetica').fontSize(8.5).fillColor('#000');
    doc.text(r.name || '—', L, y, { width: 172, lineBreak: false });
    doc.text(isCrew(r) ? (r.role === 'volunteer' ? 'volunteer' : 'crew') : 'passenger', L + 175, y, { width: 55, lineBreak: false });
    doc.text(String(r.adults), L + 234, y, { width: 18, lineBreak: false });
    doc.text(String(r.minor_count || 0), L + 254, y, { width: 18, lineBreak: false });
    doc.text(r.checked_out_at ? `out ${clock(r.checked_out_at)}` : clock(r.checked_in_at), L + 274, y, { width: 48, lineBreak: false });
    const kids = (r.minor_names || []).map(m => `${m.name}${m.age != null ? ` (${m.age})` : ''}`).join(', ');
    const ice = r.emergency_name ? `ICE: ${r.emergency_name} ${r.emergency_phone || ''}`.trim() : '';
    doc.fontSize(7.5).fillColor('#333').text([kids, ice].filter(Boolean).join('  ·  ') || '—', L + 324, y, { width: W - 324 });
    y = Math.max(doc.y, y + 11) + 1;
    doc.moveTo(L, y - 1).lineTo(R, y - 1).lineWidth(0.3).strokeColor('#ddd').stroke();
  };

  header('ON BOARD', aboard.length);
  if (!aboard.length) { doc.font('Helvetica-Oblique').fontSize(9).fillColor('#666').text('Nobody checked in.', L, y); y = doc.y + 6; }
  aboard.forEach(line);

  if (ashore.length) {
    header('WENT ASHORE', ashore.length);
    ashore.forEach(line);
  }

  // --- signature ----------------------------------------------------------
  // Pin the closing block so the signature lines never crowd the footer.
  if (y > 620) { doc.addPage(); y = 60; }
  y = Math.max(y + 16, 632);
  doc.font('Helvetica').fontSize(7.5).fillColor('#333').text(
    'This manifest is generated from waivers signed by each person aboard and from check-in records taken at the brow. ' +
    'Children are persons under 18 and are aboard in the care of the named adult. Comanche is not a passenger vessel for hire; ' +
    'those aboard are guests and volunteers of the Foundation and pay no fare.', L, y, { width: W });
  y = doc.y + 16;

  const sigLine = (label, x, w) => {
    doc.moveTo(x, y + 12).lineTo(x + w, y + 12).lineWidth(0.6).strokeColor('#000').stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor('#555').text(label, x, y + 15, { width: w });
  };
  sigLine('Master / person in charge', L, 250);
  sigLine('Date and time', L + 270, W - 270);

  doc.font('Helvetica').fontSize(7).fillColor('#666')
    .text(`${ORG}  ·  tug202.org  ·  manifest for sailing #${sailing.id}`, L, 726, { width: W, align: 'center', lineBreak: false });

  doc.end();
  return done;
}

module.exports = { manifestPdf };
