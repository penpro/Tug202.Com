// Renders the printable donation assets from print/*.html into public/donate/.
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
const fileUrl = (rel) => 'file:///' + path.join(ROOT, rel).replace(/\\/g, '/');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
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

  await browser.close();
})();
