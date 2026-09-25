import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const rootPath = root.pathname;
const excluded = new Set(['node_modules', '.git', 'public']);
const textExt = new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.html','.md','.json','.yml','.yaml','.txt','.css','.sql','.webmanifest','']);
const forbidden = [
  'RV Buddy',
  'GloveGate',
  'AquaStep',
  'Aurora-core-beta',
  'VaultOS',
  'Island Valet Trash',
  'STILL STANDING',
  '409-632-0200',
  '4a3c079e-c4e4-4970-be6e-5d7cd45df2f1',
  '849b2d36-4c69-41fd-8578-13ed9584bb7e',
  'prj_9dUHR4SFGqxOonE7qSfo0xg6y10K',
  'Zachary'
];
const secretPatterns = [
  new RegExp('sk-[A-Za-z0-9_-]{20,}', 'g'),
  new RegExp('gh[pousr]_[A-Za-z0-9]{20,}', 'g'),
  new RegExp('AKIA[0-9A-Z]{16}', 'g'),
  new RegExp('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'g')
];

let failed=false;
function fail(msg){console.error('FAIL '+msg);failed=true;}
function walk(dir){
  for(const name of readdirSync(dir)){
    if(excluded.has(name))continue;
    const full=join(dir,name);
    const st=statSync(full);
    if(st.isDirectory()){walk(full);continue;}
    const ext=extname(name);
    if(!textExt.has(ext))continue;
    let text='';
    try{text=readFileSync(full,'utf8');}catch{continue;}
    const rel=relative(rootPath,full);
    if(rel!=='scripts/check.mjs')for(const term of forbidden)if(text.includes(term))fail(rel+' contains private shell term: '+term);
    for(const re of secretPatterns){
      if(re.test(text))fail(rel+' may contain a secret: '+re.source);
      re.lastIndex=0;
    }
  }
}
walk(rootPath);

const src=readFileSync(new URL('../src/system.html',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const middleware=readFileSync(new URL('../middleware.js',import.meta.url),'utf8');
const scriptOpen=src.lastIndexOf('<script>');
const scriptClose=src.lastIndexOf('</script>');
if(scriptOpen<0||scriptClose<=scriptOpen)fail('inline application script missing');
else{
  const browserJs=src.slice(scriptOpen+8,scriptClose);
  try{
    const { Script }=await import('node:vm');
    new Script(browserJs,{filename:'src/system.inline.js'});
    console.log('PASS inline browser JavaScript parses');
  }catch(e){fail('inline browser JavaScript parse error: '+e.message);}
}

const required=[
  ['state hydrator',src.includes('hydrateSystemState')],
  ['event ledger',src.includes('renderEvents')],
  ['server weight sync',src.includes("postSystemState('weights'")],
  ['session verifier public path',middleware.includes("'/api/session/verify'")],
  ['safe fallback in source',src.includes("id:'system'")],
  ['safe fallback in generated app',index.includes("id:'system'")]
];
for(const [name,ok] of required){
  console.log((ok?'PASS ':'FAIL ')+name);
  if(!ok)failed=true;
}

if(failed)process.exit(1);
console.log('McLain System verification passed.');
