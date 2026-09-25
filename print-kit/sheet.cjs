// Contact sheet of the whole kit, for a quick visual check and for the artifact.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 });
  const img = n => `<img src="out/${n}.png" style="height:100%;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.35)">`;
  await p.setContent(`<body style="margin:0;background:#0a1826;display:flex;gap:28px;align-items:center;padding:36px;height:900px;box-sizing:border-box">
  <div style="height:100%">${img('door-hanger-front')}</div><div style="height:100%">${img('door-hanger-back')}</div>
  <div style="height:100%">${img('flyer')}</div><div style="height:100%">${img('office-sign')}</div>
  <div style="display:flex;flex-direction:column;justify-content:center;gap:22px;height:100%"><div style="height:30%">${img("card-front")}</div><div style="height:30%">${img("card-back")}</div></div></body>`, { waitUntil: 'load' });
  await p.goto('about:blank'); // setContent can't load file:// images; write and reload instead
  require('fs').writeFileSync(__dirname + '/_sheet.html', `<body style="margin:0;background:#0a1826;display:flex;gap:28px;align-items:center;padding:36px;height:900px;box-sizing:border-box">
  <div style="height:100%">${img('door-hanger-front')}</div><div style="height:100%">${img('door-hanger-back')}</div>
  <div style="height:100%">${img('flyer')}</div><div style="height:100%">${img('office-sign')}</div>
  <div style="display:flex;flex-direction:column;justify-content:center;gap:22px;height:100%"><div style="height:30%">${img("card-front")}</div><div style="height:30%">${img("card-back")}</div></div></body>`);
  await p.goto('file://' + __dirname + '/_sheet.html'); await p.waitForTimeout(400);
  const w = await p.evaluate(() => document.body.scrollWidth); await p.setViewportSize({ width: w, height: 900 });
  await p.screenshot({ path: __dirname + '/out/kit-sheet.png' }); await b.close();
})();
