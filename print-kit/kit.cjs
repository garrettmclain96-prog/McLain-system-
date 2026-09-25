// Island Valet Trash — print kit generator.
// Builds each piece as trim-size HTML, renders a print PDF + PNG preview with
// Playwright, then merges everything into one kit PDF with pdf-lib.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');

const DIR = __dirname;
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });

const PHONE = '409-632-0200';

const BASE = `
:root{--navy:#0B2540;--navy2:#123A5C;--glass:#9ED9C8;--glassd:#3E9C86;--sand:#F3E8D2;--sand2:#E4D1AA;--foam:#FBF8F1;--ink:#0B2540;--mute:#4A6178}
*{box-sizing:border-box;margin:0;padding:0}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Figtree',sans-serif;color:var(--ink);background:var(--foam)}
.serif{font-family:'Fraunces',serif}
.caps{text-transform:uppercase;letter-spacing:.18em;font-weight:800}
.page{position:relative;overflow:hidden}
.wave{position:absolute;left:0;right:0;width:100%}
`;

// Tied-bag mark with a sea-glass wave through it.
const MARK = (fill = 'var(--sand)', wave = 'var(--glass)') => `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M22 23 C13 31 11 45 17 52.5 C23 59 41 59 47 52.5 C53 45 51 31 42 23 Z" fill="${fill}"/>
  <path d="M28 21.5 C25 15 20 11 14.5 11.5 C18.5 15.5 23 19 27.5 22 Z" fill="${fill}"/>
  <path d="M36 21.5 C39 15 44 11 49.5 11.5 C45.5 15.5 41 19 36.5 22 Z" fill="${fill}"/>
  <rect x="26.5" y="18.5" width="11" height="6.5" rx="3.2" fill="${fill}"/>
  <path d="M14 42 C20 38 25 46 32 42 C39 38 44 46 50 42" fill="none" stroke="${wave}" stroke-width="3.6" stroke-linecap="round"/>
</svg>`;

// Rolling sea-glass swell used as a section divider.
const SWELL = (color, h = 0.5) => `
<div style="position:relative;height:${h}in"><svg class="wave" viewBox="0 0 400 40" preserveAspectRatio="none" style="top:0;height:100%">
  <path d="M0 22 C40 8 80 8 120 20 C160 32 200 32 240 20 C280 8 320 8 360 20 C380 26 392 28 400 27 L400 40 L0 40 Z" fill="${color}"/>
</svg></div>`;

const LOCKUP = (size, color = 'var(--sand)', accent = 'var(--glass)') => `
<div style="display:flex;align-items:center;gap:${size * 0.28}in">
  <div style="width:${size}in;height:${size}in;flex:none">${MARK(color, accent)}</div>
  <div style="line-height:1">
    <div class="caps" style="font-size:${size * 0.2}in;color:${accent};letter-spacing:.32em">Island</div>
    <div class="serif" style="font-weight:800;font-size:${size * 0.46}in;color:${color};margin-top:${size * 0.04}in;letter-spacing:-.01em">Valet Trash</div>
  </div>
</div>`;

const STEP = (n, title, body, opt = {}) => `
<div style="display:flex;gap:${opt.gap || 0.16}in;align-items:flex-start">
  <div class="serif" style="flex:none;width:${opt.dot || 0.5}in;height:${opt.dot || 0.5}in;border-radius:50%;background:var(--navy);color:var(--glass);display:grid;place-items:center;font-weight:800;font-size:${(opt.dot || 0.5) * 0.52}in">${n}</div>
  <div>
    <div class="serif" style="font-weight:800;font-size:${opt.t || 0.25}in;line-height:1.1">${title}</div>
    <div style="font-size:${opt.b || 0.135}in;line-height:1.35;color:var(--mute);margin-top:.03in">${body}</div>
  </div>
</div>`;

const NOPE = [
  ['Propane cylinders', 'even “empty” ones still hold gas'],
  ['Lithium batteries & vapes', 'they start fires in the haul'],
  ['Motor oil, fuel, or their cans', ''],
  ['Car / RV batteries', 'lead-acid goes to recycling'],
  ['Hot coals or ashes', 'let them sit cold 48 hours'],
  ['Needles or sharps', 'use a sealed sharps box'],
];

const PIECES = [
  {
    id: 'door-hanger-front', w: 4.25, h: 11, label: 'Door hanger — front (4.25×11 in)',
    html: `
<div class="page" style="width:4.25in;height:11in;background:var(--sand)">
  <div style="position:relative;height:4.8in;background:var(--navy);padding:0 .38in">
    <!-- die line: hanger hole + slit (do not print — cut guide) -->
    <svg style="position:absolute;left:0;top:0;width:4.25in;height:2.3in" viewBox="0 0 425 230">
      <circle cx="212.5" cy="112" r="68" fill="var(--foam)"/>
      <circle cx="212.5" cy="112" r="68" fill="none" stroke="#E0007A" stroke-width="1.4" stroke-dasharray="5 4"/>
      <line x1="212.5" y1="44" x2="212.5" y2="0" stroke="#E0007A" stroke-width="1.4" stroke-dasharray="5 4"/>
    </svg>
    <div style="position:absolute;left:0;right:0;top:2.42in;display:flex;justify-content:center">${LOCKUP(0.78)}</div>
    <div class="serif" style="position:absolute;left:.38in;right:.38in;top:3.52in;text-align:center;color:var(--foam);font-weight:600;font-size:.285in;line-height:1.1">Leave it by the post.<br><span style="color:var(--glass)">We’ll take it from here.</span></div>
    <div style="position:absolute;left:0;right:0;bottom:-1px">${SWELL('var(--sand)', 0.42)}</div>
  </div>
  <div style="padding:.34in .4in 0;display:grid;gap:.3in">
    ${STEP(1, 'Tie it.', 'Tied bags only — gulls and raccoons can’t open a knot.', { dot: .56, t: .29, b: .145 })}
    ${STEP(2, 'Post it by 7 PM.', 'Set it on the ground right beside your site post.', { dot: .56, t: .29, b: .145 })}
    ${STEP(3, 'Forget it.', 'We haul it off. You keep your evening.', { dot: .56, t: .29, b: .145 })}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:2.12in;display:flex;justify-content:center">
    <div class="caps" style="font-size:.1in;letter-spacing:.2em;background:var(--glass);color:var(--navy);border-radius:99px;padding:.09in .2in">Bags out by 7 PM · Tied · By the post</div>
  </div>
  <div style="position:absolute;left:.3in;right:.3in;bottom:.34in;border-radius:.16in;background:var(--navy);color:var(--foam);padding:.2in .24in;text-align:center">
    <div class="caps" style="font-size:.11in;color:var(--glass)">Not signed up yet?</div>
    <div class="serif" style="font-weight:800;font-size:.27in;margin-top:.05in">Sign up at the front office</div>
    <div style="font-size:.15in;margin-top:.05in;font-weight:600;letter-spacing:.04em">${PHONE}</div>
  </div>
</div>`,
  },
  {
    id: 'door-hanger-back', w: 4.25, h: 11, label: 'Door hanger — back (4.25×11 in)',
    html: `
<div class="page" style="width:4.25in;height:11in;background:var(--foam)">
  <svg style="position:absolute;left:0;top:0;width:4.25in;height:2.3in" viewBox="0 0 425 230">
    <circle cx="212.5" cy="112" r="68" fill="var(--sand)"/>
    <circle cx="212.5" cy="112" r="68" fill="none" stroke="#E0007A" stroke-width="1.4" stroke-dasharray="5 4"/>
    <line x1="212.5" y1="44" x2="212.5" y2="0" stroke="#E0007A" stroke-width="1.4" stroke-dasharray="5 4"/>
  </svg>
  <div style="position:absolute;top:2.35in;left:.42in;right:.42in">
    <div class="caps" style="font-size:.11in;color:var(--glassd)">Keep the crew safe</div>
    <div class="serif" style="font-weight:800;font-size:.36in;line-height:1.05;margin-top:.06in">What stays <span style="color:var(--glassd)">out</span> of the bag</div>
    <div style="margin-top:.2in;display:grid;gap:.12in">
      ${NOPE.map(([t, s]) => `
      <div style="display:flex;gap:.12in;align-items:flex-start">
        <div style="flex:none;width:.24in;height:.24in;border-radius:50%;border:2px solid var(--navy);display:grid;place-items:center;margin-top:.01in">
          <svg viewBox="0 0 10 10" style="width:.1in;height:.1in"><path d="M2 2 L8 8 M8 2 L2 8" stroke="var(--navy)" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div style="font-size:.15in;line-height:1.3"><b>${t}</b>${s ? `<br><span style="color:var(--mute);font-size:.125in">${s}</span>` : ''}</div>
      </div>`).join('')}
    </div>
    <div style="margin-top:.24in;border-radius:.16in;background:var(--sand);padding:.2in .22in;display:flex;gap:.14in;align-items:flex-start">
      <svg viewBox="0 0 24 24" style="flex:none;width:.34in;height:.34in"><circle cx="12" cy="12" r="11" fill="var(--glassd)"/><path d="M6.5 12.5 L10.5 16 L17.5 8.5" fill="none" stroke="var(--foam)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div><div class="serif" style="font-weight:800;font-size:.22in">Good to go</div>
      <div style="font-size:.135in;line-height:1.4;color:var(--mute);margin-top:.03in">Any tied household trash bag, set by your site post by 7 PM.</div></div>
    </div>
    <div style="margin-top:.2in;font-size:.13in;line-height:1.4;color:var(--mute)">Not sure where something goes? The front office can point you the right way.</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:1.35in;background:var(--navy)">
    <div style="position:absolute;left:0;right:0;top:-.4in">${SWELL('var(--navy)', 0.42)}</div>
    <div style="position:absolute;inset:.2in .38in;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:.08in">
      ${LOCKUP(0.5)}
      <div class="caps" style="font-size:.1in;color:var(--glass);letter-spacing:.24em">Bags out by 7 PM · Tied · By the post</div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'flyer', w: 8.5, h: 11, label: 'Flyer (8.5×11 in)',
    html: `
<div class="page" style="width:8.5in;height:11in;background:var(--sand)">
  <div style="position:relative;height:4.4in;background:var(--navy);padding:.5in .6in 0">
    <svg style="position:absolute;right:-.6in;top:-.4in;width:4.4in;opacity:.08" viewBox="0 0 64 64">${MARK('var(--glass)', 'var(--navy)').replace(/<\/?svg[^>]*>/g, '')}</svg>
    ${LOCKUP(0.95)}
    <div class="serif" style="margin-top:.42in;color:var(--foam);font-weight:800;font-size:.64in;line-height:1;letter-spacing:-.015em;max-width:6.4in">Put it out by 7.<br><span style="color:var(--glass)">We handle the rest.</span></div>
    <div style="margin-top:.2in;color:var(--sand);font-size:.2in;line-height:1.4;max-width:5.6in;opacity:.92">Door-side trash pickup for RV sites. No more hauling bags across the park to a dumpster that’s already full.</div>
    <div style="position:absolute;left:0;right:0;bottom:-1px">${SWELL('var(--sand)', 0.55)}</div>
  </div>
  <div style="padding:.22in .6in 0;display:grid;grid-template-columns:repeat(3,1fr);gap:.3in">
    ${[['1', 'Tie it', 'Tied bags only. Gulls and raccoons can’t open a knot.'], ['2', 'Post it', 'Set it by your site post by 7 PM.'], ['3', 'Forget it', 'We haul it off. Your evening stays yours.']].map(([n, t, b]) => `
    <div style="background:var(--foam);border-radius:.18in;padding:.24in .22in;border:1.5px solid var(--sand2)">
      <div class="serif" style="width:.56in;height:.56in;border-radius:50%;background:var(--navy);color:var(--glass);display:grid;place-items:center;font-weight:800;font-size:.3in">${n}</div>
      <div class="serif" style="font-weight:800;font-size:.3in;margin-top:.14in">${t}</div>
      <div style="font-size:.15in;line-height:1.4;color:var(--mute);margin-top:.06in">${b}</div>
    </div>`).join('')}
  </div>
  <div style="padding:.28in .6in 0;display:grid;grid-template-columns:1.15fr 1fr;gap:.34in;align-items:start">
    <div>
      <div class="caps" style="font-size:.12in;color:var(--glassd)">Why guests sign up</div>
      <div style="display:grid;gap:.1in;margin-top:.12in;font-size:.17in;line-height:1.35">
        ${['No late-night walk to an overflowing dumpster', 'No critters digging through your campsite', 'Nothing smelling up the slab in the heat', 'More evening on the water, less trash duty'].map(t => `
        <div style="display:flex;gap:.1in"><svg viewBox="0 0 12 12" style="flex:none;width:.16in;height:.16in;margin-top:.03in"><path d="M2 6.5 L5 9 L10 3" fill="none" stroke="var(--glassd)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t}</span></div>`).join('')}
      </div>
    </div>
    <div style="background:var(--navy);color:var(--foam);border-radius:.2in;padding:.26in .26in;text-align:center">
      <div class="caps" style="font-size:.11in;color:var(--glass)">Ready?</div>
      <div class="serif" style="font-weight:800;font-size:.34in;line-height:1.05;margin-top:.06in">Sign up at the front office</div>
      <div style="font-size:.2in;font-weight:600;margin-top:.1in;letter-spacing:.04em">${PHONE}</div>
      <div style="font-size:.12in;margin-top:.06in;opacity:.75">Ask for Island Valet Trash</div>
    </div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:1.5in;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));border-top:2px dashed var(--navy);background:var(--foam)">
    ${Array.from({ length: 8 }, () => `
    <div style="border-left:1.5px dashed var(--sand2);display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:0">
      <div style="transform:rotate(-90deg);white-space:nowrap;text-align:center;line-height:1.15">
        <div class="serif" style="font-weight:800;font-size:.13in">Island Valet Trash</div>
        <div style="font-size:.1in;color:var(--mute);margin-top:.02in">Front office</div>
        <div style="font-size:.1in;font-weight:600">${PHONE}</div>
      </div>
    </div>`).join('')}
  </div>
</div>`,
  },
  {
    id: 'card-front', w: 3.5, h: 2, label: 'Business card — front (3.5×2 in)',
    html: `
<div class="page" style="width:3.5in;height:2in;background:var(--navy);display:flex;flex-direction:column;justify-content:center;padding:0 .28in">
  ${LOCKUP(0.62)}
  <div style="margin-top:.14in;color:var(--sand);font-size:.105in;letter-spacing:.02em;opacity:.9">Door-side trash pickup for RV sites</div>
  <div style="position:absolute;left:0;right:0;bottom:-1px">${SWELL('var(--navy2)', 0.26)}</div>
</div>`,
  },
  {
    id: 'card-back', w: 3.5, h: 2, label: 'Business card — back (3.5×2 in)',
    html: `
<div class="page" style="width:3.5in;height:2in;background:var(--sand);padding:.24in .28in;display:flex;flex-direction:column;justify-content:space-between">
  <div>
    <div class="serif" style="font-weight:800;font-size:.2in">Garrett McLain</div>
    <div class="caps" style="font-size:.075in;color:var(--glassd);margin-top:.03in;letter-spacing:.22em">Owner · Operator</div>
  </div>
  <div style="font-size:.1in;line-height:1.5">
    <div><b>Bags out by 7 PM</b> · tied · by the site post</div>
    <div>Sign up at the front office · <b>${PHONE}</b></div>
  </div>
  <div style="position:absolute;right:.22in;top:.22in;width:.42in;height:.42in">${MARK('var(--navy)', 'var(--glassd)')}</div>
</div>`,
  },
  {
    id: 'office-sign', w: 11, h: 17, label: 'Front-office sign (11×17 in)',
    html: `
<div class="page" style="width:11in;height:17in;background:var(--navy);color:var(--foam)">
  <svg style="position:absolute;right:-1.1in;top:4.3in;width:5in;opacity:.06" viewBox="0 0 64 64">${MARK('var(--glass)', 'var(--navy)').replace(/<\/?svg[^>]*>/g, '')}</svg>
  <div style="padding:.9in .85in 0">
    ${LOCKUP(1.35)}
    <div class="caps" style="margin-top:.9in;font-size:.24in;color:var(--glass)">Now taking sign-ups</div>
    <div class="serif" style="margin-top:.16in;font-weight:800;font-size:1.12in;line-height:.98;letter-spacing:-.02em">Skip the<br>dumpster walk.</div>
    <div style="margin-top:.34in;font-size:.34in;line-height:1.35;max-width:8.2in;color:var(--sand)">We pick up your trash right from your site. Tie the bag, set it by your post by 7 PM, and you’re done.</div>
  </div>
  <div style="position:absolute;left:0;right:0;top:9.1in">${SWELL('var(--sand)', 0.8)}</div>
  <div style="position:absolute;left:0;right:0;top:9.88in;bottom:0;background:var(--sand);color:var(--ink);padding:.5in .85in 0">
    <div style="display:grid;gap:.4in">
      ${STEP(1, 'Tie it.', 'Tied bags only — gulls and raccoons can’t open a knot.', { dot: 0.95, t: 0.5, b: 0.26, gap: 0.3 })}
      ${STEP(2, 'Post it by 7 PM.', 'Right beside your site post.', { dot: 0.95, t: 0.5, b: 0.26, gap: 0.3 })}
      ${STEP(3, 'Forget it.', 'We haul it off. Your evening stays yours.', { dot: 0.95, t: 0.5, b: 0.26, gap: 0.3 })}
    </div>
    <div style="position:absolute;left:.85in;right:.85in;bottom:.7in;background:var(--navy);color:var(--foam);border-radius:.3in;padding:.34in .5in;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div class="serif" style="font-weight:800;font-size:.62in;line-height:1">Sign up right here.</div>
        <div style="font-size:.26in;margin-top:.1in;color:var(--glass)">Ask at the desk for Island Valet Trash</div>
      </div>
      <svg viewBox="0 0 40 40" style="width:1.05in;height:1.05in;flex:none"><circle cx="20" cy="20" r="19" fill="var(--glass)"/><path d="M20 10 V29 M12 21 L20 29 L28 21" fill="none" stroke="var(--navy)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </div>
</div>`,
  },
];

function doc(p) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="fonts_local.css">
<style>${BASE}@page{size:${p.w}in ${p.h}in;margin:0}html,body{width:${p.w}in;height:${p.h}in;overflow:hidden}</style>
</head><body>${p.html}</body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const kit = await PDFDocument.create();
  const report = [];
  for (const p of PIECES) {
    const file = path.join(DIR, `_${p.id}.html`);
    fs.writeFileSync(file, doc(p));
    const page = await browser.newPage({ viewport: { width: Math.round(p.w * 96), height: Math.round(p.h * 96) }, deviceScaleFactor: p.w > 5 ? 1.5 : 3 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + file);
    const fontsOk = await page.evaluate(async () => {
      const faces = ['600 20px Fraunces', '800 20px Fraunces', '400 20px Figtree', '600 20px Figtree', '800 20px Figtree'];
      const loaded = await Promise.all(faces.map(f => document.fonts.load(f)));
      await document.fonts.ready;
      return loaded.every(l => l.length > 0);
    });
    // Anything spilling past the trim edge is a layout bug.
    const overflow = await page.evaluate(() => {
      const pg = document.querySelector('.page').getBoundingClientRect();
      return [...document.querySelectorAll('.page *')].filter(el => {
        if (el.closest('svg.wave') || el.tagName === 'svg' && el.style.opacity) return false;
        const r = el.getBoundingClientRect();
        return r.width && (r.right > pg.right + 1 || r.bottom > pg.bottom + 1 || r.left < pg.left - 1);
      }).map(el => el.textContent.trim().slice(0, 40)).filter(Boolean).slice(0, 5);
    });
    await page.screenshot({ path: path.join(OUT, `${p.id}.png`) });
    const pdf = await page.pdf({ width: `${p.w}in`, height: `${p.h}in`, printBackground: true, pageRanges: '1' });
    fs.writeFileSync(path.join(OUT, `${p.id}.pdf`), pdf);
    const src = await PDFDocument.load(pdf);
    const [pg] = await kit.copyPages(src, [0]);
    kit.addPage(pg);
    report.push({ id: p.id, pages: src.getPageCount(), size: src.getPage(0).getSize(), fontsOk, overflow, errs });
    await page.close();
  }
  kit.setTitle('Island Valet Trash — Print Kit');
  kit.setAuthor('Garrett McLain');
  fs.writeFileSync(path.join(OUT, 'Island_Valet_Trash_Print_Kit.pdf'), await kit.save());
  await browser.close();
  for (const r of report) console.log(JSON.stringify(r));
})();
