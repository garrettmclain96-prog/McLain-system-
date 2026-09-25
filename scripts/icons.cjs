// Renders the home-screen icons (a glowing sun with one orbit and one planet) with Playwright.
// Run once after changing the design: npm run icons
const { chromium } = require('playwright');
const path = require('path');

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="48%" r="70%"><stop offset="0" stop-color="#1A1530"/><stop offset=".55" stop-color="#0A0F1E"/><stop offset="1" stop-color="#05070E"/></radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFB547" stop-opacity=".55"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></radialGradient>
    <radialGradient id="sun" cx="42%" cy="38%" r="65%"><stop offset="0" stop-color="#FFF6DA"/><stop offset=".45" stop-color="#FFBE55"/><stop offset="1" stop-color="#E4611A"/></radialGradient>
    <radialGradient id="planet" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#8FE3F2"/><stop offset="1" stop-color="#0D3A56"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${1 - pad})">
    <circle r="210" fill="url(#glow)"/>
    <ellipse rx="190" ry="70" fill="none" stroke="#F4B740" stroke-opacity=".55" stroke-width="5" transform="rotate(-18)"/>
    <circle r="92" fill="url(#sun)"/>
    <circle cx="124" cy="-88" r="26" fill="url(#planet)"/>
  </g>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  const out = path.join(__dirname, '..', 'icons');
  const jobs = [['apple-touch-icon.png', 180, 0.02], ['icon-192.png', 192, 0.02], ['icon-512.png', 512, 0.02], ['icon-512-maskable.png', 512, 0.22]];
  for (const [name, size, pad] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0">${svg(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await page.screenshot({ path: path.join(out, name) });
    await page.close();
  }
  await browser.close();
  console.log('icons written');
})();
