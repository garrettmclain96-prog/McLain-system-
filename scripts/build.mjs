// Builds the standalone page (index.html) from the Claude artifact source (src/system.html).
// The artifact source is a page fragment: claude.ai wraps it in <html>/<head>/<body> when it
// publishes, so this script does the same wrapping for running the page anywhere else.
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';

const src = readFileSync(new URL('../src/system.html', import.meta.url), 'utf8');
const titleMatch = src.match(/<title>[\s\S]*?<\/title>/);
const title = titleMatch ? titleMatch[0] : '<title>The McLain System</title>';
const body = titleMatch ? src.replace(titleMatch[0], '').trimStart() : src;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${title}
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="theme-color" content="#05070E">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="McLain">
<!-- Generated from src/system.html by scripts/build.mjs. Edit the source, then run: npm run build -->
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync(new URL('../index.html', import.meta.url), html);
console.log(`index.html written (${html.length.toLocaleString()} bytes)`);

// public/ is what Vercel serves: the page and the files it needs, never the source.
const root = new URL('../', import.meta.url);
const pub = new URL('../public/', import.meta.url);
rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
for (const file of ['index.html', 'login.html', 'manifest.webmanifest', 'robots.txt']) {
  cpSync(new URL(file, root), new URL(file, pub));
}
cpSync(new URL('icons/', root), new URL('icons/', pub), { recursive: true });
console.log('public/ ready');
