// Renders printable assets from print/*.html:
//   public/donate/     flyer, 4x6 card, QR PNG
//   public/documents/  donation receipt (B/W)
//   public/grants/     one PDF per proposal in src/content/grants.js
// Run locally (needs a Chromium via puppeteer); commit the outputs so the
// server never needs a browser.
//
//   node scripts/build-print-assets.cjs
//
// Puppeteer is not a dependency of this project; point PUPPETEER_DIR at any
// node_modules that has it (defaults to the WebDevClass frontend on Wes's box).
const path = require('path');
const fs = require('fs');
const PUPPETEER_DIR = process.env.PUPPETEER_DIR || 'D:/WebDevClass/hello-world/frontend/node_modules';
const puppeteer = require(path.join(PUPPETEER_DIR, 'puppeteer'));

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'donate');
const DOCS = path.join(ROOT, 'public', 'documents');
const GRANTS = path.join(ROOT, 'public', 'grants');
const { pathToFileURL } = require('url');
const fileUrl = (rel) => 'file:///' + path.join(ROOT, rel).replace(/\\/g, '/');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(DOCS, { recursive: true });
  fs.mkdirSync(GRANTS, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  async function render(html, base, { width, height, scale }) {
    await page.goto(fileUrl('print/' + html), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(OUT, base + '.pdf'),
      width: `${width}in`, height: `${height}in`,
      printBackground: true, preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    await page.setViewport({ width: Math.round(width * 96), height: Math.round(height * 96), deviceScaleFactor: scale });
    await page.screenshot({ path: path.join(OUT, base + '.png'), clip: { x: 0, y: 0, width: width * 96, height: height * 96 } });
    console.log('wrote', base + '.pdf', base + '.png');
  }

  await render('flyer-letter.html', 'tug-comanche-donate-flyer-letter', { width: 8.5, height: 11, scale: 2 });
  await render('card-4x6.html', 'tug-comanche-donate-card-4x6', { width: 6, height: 4, scale: 3 });

  // High-res PNG of the QR alone for slides, social posts and signage.
  await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });
  await page.goto(fileUrl('print/qr.html'), { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT, 'tug-comanche-donate-qr.png'), clip: { x: 0, y: 0, width: 1200, height: 1200 } });
  console.log('wrote tug-comanche-donate-qr.png');

  // Donation receipt: single Letter page, B/W. PDF + PNG preview.
  await page.goto(fileUrl('print/donation-receipt.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(DOCS, 'tug-comanche-donation-receipt.pdf'), width: '8.5in', height: '11in', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 2 });
  await page.screenshot({ path: path.join(DOCS, 'tug-comanche-donation-receipt.png'), clip: { x: 0, y: 0, width: 816, height: 1056 } });
  console.log('wrote documents/tug-comanche-donation-receipt.pdf/.png');

  // Grant proposals: one multi-page Letter PDF each, rendered from the same
  // data the /grants pages use. Loaded as ESM via dynamic import.
  const { grants, boilerplate } = await import(pathToFileURL(path.join(ROOT, 'src', 'content', 'grants.js')).href);
  const { org } = await import(pathToFileURL(path.join(ROOT, 'src', 'site.config.js')).href);
  const footer = `<div style="font-family:Arial,sans-serif;font-size:7.5pt;color:#555;width:100%;padding:0 0.75in;display:flex;justify-content:space-between;">
      <span>Tug Comanche Historical Rescue Foundation &middot; EIN ${org.ein} &middot; tug202.org</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
  for (const g of grants) {
    await page.goto(fileUrl('print/grant.html'), { waitUntil: 'networkidle0' });
    await page.evaluate((g, bp, o) => window.render(g, bp, o), g, boilerplate, org);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(GRANTS, g.slug + '.pdf'), format: 'Letter', printBackground: true,
      margin: { top: '0.7in', right: '0.75in', bottom: '0.8in', left: '0.75in' },
      displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer
    });
    console.log('wrote grants/' + g.slug + '.pdf');
  }

  await browser.close();
})();
