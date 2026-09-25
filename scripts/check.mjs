import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/system.html', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const middleware = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');

const checks = [
  ['state hydrator', src.includes('hydrateSystemState')],
  ['server weight sync', src.includes("postSystemState('weights'")],
  ['source private payload removed', !src.includes("id:'jops'") && !src.includes('RV Buddy intro ask')],
  ['generated app private payload removed', !index.includes("id:'jops'") && !index.includes('RV Buddy intro ask')],
  ['session verifier bypasses login gate', middleware.includes("'/api/session/verify'")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failed = true;
}

const patterns = [
  new RegExp('sk-[A-Za-z0-9_-]{20,}', 'g'),
  new RegExp('gh[pousr]_[A-Za-z0-9]{20,}', 'g'),
  new RegExp('AKIA[0-9A-Z]{16}', 'g'),
  new RegExp('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'g'),
];

for (const [name, text] of [['src/system.html', src], ['index.html', index]]) {
  for (const re of patterns) {
    if (re.test(text)) {
      console.error('FAIL possible secret in ' + name + ': ' + re.source);
      failed = true;
    }
    re.lastIndex = 0;
  }
}

if (failed) process.exit(1);
console.log('McLain System verification passed.');
