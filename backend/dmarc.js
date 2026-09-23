// DMARC aggregate reports. Providers (Google, Microsoft, Yahoo, Comcast…) mail
// one per day to the rua= address in our DNS record; each is an XML file,
// gzipped or zipped. We take the file, not the mail: an admin drops it on the
// Dashboard and we store the parts that matter.
//
// What a report actually says: "here is every IP that sent mail claiming to be
// tug202.org today, and whether it authenticated." It never names a recipient,
// so it tells us nothing about bounces — that's SES's suppression list. What it
// does tell us is whether anyone ELSE is sending as us.

const zlib = require('zlib');

// ---- containers -------------------------------------------------------------
// Accepts gzip, zip (stored or deflated, first entry), or plain XML bytes.
function unwrap(buf) {
  if (buf[0] === 0x1f && buf[1] === 0x8b) return zlib.gunzipSync(buf);
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // Local file header: sig(4) ver(2) flags(2) method(2) time(4) crc(4)
    // csize(4) usize(4) namelen(2) extralen(2) then name, extra, data.
    const method = buf.readUInt16LE(8);
    const nameLen = buf.readUInt16LE(26), extraLen = buf.readUInt16LE(28);
    const start = 30 + nameLen + extraLen;
    let cSize = buf.readUInt32LE(18);
    if (!cSize) { // streamed entry: sizes live in the trailing descriptor
      const end = buf.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]), start);
      cSize = (end > start ? end : buf.length) - start;
    }
    const data = buf.subarray(start, start + cSize);
    return method === 0 ? data : zlib.inflateRawSync(data);
  }
  return buf;
}

// ---- tiny XML reader --------------------------------------------------------
// The DMARC schema is fixed and shallow, so tag scraping beats a dependency.
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1].trim()) : null; };
const all = (xml, name) => [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g'))].map(m => m[1]);

// Returns { report: {...}, rows: [...] }; throws if it isn't a DMARC report.
function parse(buf) {
  const xml = unwrap(buf).toString('utf8');
  if (!/<feedback[\s>]/.test(xml)) throw new Error('Not a DMARC aggregate report (no <feedback> element)');
  const meta = (xml.match(/<report_metadata>([\s\S]*?)<\/report_metadata>/) || [, ''])[1];
  const pol = (xml.match(/<policy_published>([\s\S]*?)<\/policy_published>/) || [, ''])[1];
  const range = (meta.match(/<date_range>([\s\S]*?)<\/date_range>/) || [, ''])[1];
  const secs = (v) => (v ? new Date(Number(v) * 1000) : null);

  const report = {
    report_id: tag(meta, 'report_id') || '',
    org_name: tag(meta, 'org_name') || 'unknown',
    domain: tag(pol, 'domain') || '',
    policy: tag(pol, 'p') || '',
    begins_at: secs(tag(range, 'begin')),
    ends_at: secs(tag(range, 'end'))
  };
  if (!report.report_id) throw new Error('Report is missing its report_id');

  const rows = [];
  for (const rec of all(xml, 'record')) {
    const row = (rec.match(/<row>([\s\S]*?)<\/row>/) || [, ''])[1];
    const ev = (row.match(/<policy_evaluated>([\s\S]*?)<\/policy_evaluated>/) || [, ''])[1];
    const auth = (rec.match(/<auth_results>([\s\S]*?)<\/auth_results>/) || [, ''])[1];
    const ident = (rec.match(/<identifiers>([\s\S]*?)<\/identifiers>/) || [, ''])[1];
    // Aligned = the passing domain matches the From: domain (that's what DMARC judges).
    const dkimDomains = all(auth, 'dkim').filter(d => /<result>\s*pass/.test(d)).map(d => tag(d, 'domain') || '');
    const spfDomains = all(auth, 'spf').filter(d => /<result>\s*pass/.test(d)).map(d => tag(d, 'domain') || '');
    rows.push({
      source_ip: tag(row, 'source_ip') || '',
      count: Number(tag(row, 'count')) || 0,
      disposition: tag(ev, 'disposition') || 'none',
      dkim: tag(ev, 'dkim') || 'fail',
      spf: tag(ev, 'spf') || 'fail',
      header_from: tag(ident, 'header_from') || '',
      dkim_domains: dkimDomains.join(','),
      spf_domains: spfDomains.join(',')
    });
  }
  if (!rows.length) throw new Error('Report has no records');
  return { report, rows };
}

// Amazon SES's published sending ranges are large and change; rather than track
// them, we treat "our" mail as anything whose SPF or DKIM identity is one we
// send through. Anything else authenticating as tug202.org is worth a look.
const OURS = /(^|[.,])(amazonses\.com|tug202\.org)$/;
const isOurs = (row) => [...String(row.spf_domains).split(','), ...String(row.dkim_domains).split(',')]
  .filter(Boolean).some(d => OURS.test(d.trim()));

module.exports = { parse, unwrap, isOurs };
