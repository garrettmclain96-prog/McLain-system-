import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const VERIFY = 'https://mclain-system.vercel.app/api/session/verify';
const BUCKET = 'mclain-brain';
const FIELDS = 'id,title,filename,mime,byte_count,sha256,source_url,status,extraction_method,error,attempts,lease_until,created_at,updated_at,mclain_brain_links(project_id)';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIMES = new Set(['text/plain','text/markdown','text/csv','application/json','application/pdf','image/jpeg','image/png','image/webp']);
const json = (data: unknown, status=200) => Response.json(data, {status, headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
class HttpError extends Error { constructor(message:string, public status=400){super(message);} }
function check(error:any) { if(error) throw new HttpError('Storage is temporarily unavailable.',502); }
async function bytes(req:Request,max:number) {
  const reader=req.body?.getReader(); const parts:Uint8Array[]=[]; let size=0;
  if(!reader) return new Uint8Array();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>max){await reader.cancel();throw new HttpError('File is too large.',413);}parts.push(value);}
  const out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;
}
async function authorized(req:Request) {
  const token=req.headers.get('x-mclain-session')||'';
  if(!/^[a-f0-9]{64}$/.test(token))return false;
  try{const r=await fetch(VERIFY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token}),signal:AbortSignal.timeout(10000)});
    return r.ok&&(await r.json()).valid===true;}catch{return false;}
}
async function rate(db:any,key:string,limit:number){
  const {data,error}=await db.rpc('mclain_brain_rate',{p_key:key,p_limit:limit});check(error);
  if(data!==true)throw new HttpError('Too many requests. Try again in a minute.',429);
}
async function projects(db:any){
  const {data,error}=await db.from('mclain_system_state').select('state').eq('id','primary').single();check(error);
  return (data?.state?.ventures||[]).filter((v:any)=>v?.id&&v?.name).map((v:any)=>({id:String(v.id),name:String(v.name)}));
}
async function validProject(db:any,id:unknown){
  if(!id)return null;
  if(typeof id!=='string'||id.length>120||!(await projects(db)).some((p:any)=>p.id===id))throw new HttpError('Choose an existing project.');
  return id;
}
async function event(db:any,type:string,id:string,project:string|null=null){
  const {error}=await db.from('mclain_system_events').insert({event_type:type,source:'mclain-knowledge',venture_id:project,payload:{sourceId:id}});check(error);
}
async function link(db:any,id:string,project:string|null){
  if(!project)return;
  const {error}=await db.from('mclain_brain_links').upsert({source_id:id,project_id:project},{onConflict:'source_id,project_id',ignoreDuplicates:true});check(error);
}
async function getSource(db:any,id:string,internal=false){
  if(!UUID.test(id))throw new HttpError('Invalid source ID.');
  const {data,error}=await db.from('mclain_brain_sources').select(internal?'*':FIELDS).eq('id',id).maybeSingle();check(error);
  if(!data)throw new HttpError('Source not found.',404);return data;
}
async function upload(req:Request,db:any){
  await rate(db,'upload',12);
  const raw=await bytes(req,3*1024*1024+20000);
  const form=await new Response(raw,{headers:{'content-type':req.headers.get('content-type')||''}}).formData();
  const file=form.get('file');
  if(!(file instanceof File)||!file.size||file.size>3*1024*1024||!MIMES.has(file.type))throw new HttpError('Unsupported file or file larger than 3 MB.',400);
  const title=String(form.get('title')||file.name).trim();
  if(!title||title.length>200)throw new HttpError('Use a title between 1 and 200 characters.');
  const project=await validProject(db,form.get('project'));
  let url=String(form.get('url')||'').trim()||null;
  if(url){try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password||url.length>2048)throw 0;url=parsed.href;}catch{throw new HttpError('Invalid source link.');}}
  const content=new Uint8Array(await file.arrayBuffer());
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',content)),b=>b.toString(16).padStart(2,'0')).join('');
  const {data:existing,error:findError}=await db.from('mclain_brain_sources').select('id').eq('sha256',sha).maybeSingle();check(findError);
  if(existing){await link(db,existing.id,project);return json({source:await getSource(db,existing.id),duplicate:true});}
  const path=`originals/${sha}`;
  const {error:storageError}=await db.storage.from(BUCKET).upload(path,content,{contentType:file.type,upsert:false});
  if(storageError && String(storageError.statusCode)!=='409')check(storageError);
  const {data:inserted,error:insertError}=await db.from('mclain_brain_sources').insert({title,filename:file.name.slice(0,240),mime:file.type,byte_count:file.size,sha256:sha,object_path:path,source_url:url}).select('id').single();
  if(insertError?.code==='23505'){
    const {data,error}=await db.from('mclain_brain_sources').select('id').eq('sha256',sha).single();check(error);
    await link(db,data.id,project);return json({source:await getSource(db,data.id),duplicate:true});
  }
  check(insertError);await link(db,inserted.id,project);await event(db,'knowledge.captured',inserted.id,project);
  return json({source:await getSource(db,inserted.id),duplicate:false},201);
}
async function read(req:Request,db:any){
  await rate(db,'read',180);
  const url=new URL(req.url),action=url.searchParams.get('action')||'list',id=url.searchParams.get('id')||'';
  if(action==='original'){
    const s=await getSource(db,id,true);
    const {data,error}=await db.storage.from(BUCKET).download(s.object_path);check(error);
    const disposition='inline';
    return new Response(data,{headers:{'content-type':s.mime,'content-length':String(s.byte_count),'content-disposition':`${disposition}; filename*=UTF-8''${encodeURIComponent(s.filename)}`,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'"}});
  }
  if(action==='detail'){
    const source=await getSource(db,id);
    const {data,error}=await db.from('mclain_brain_chunks').select('id,ordinal,locator,content').eq('source_id',id).order('ordinal');check(error);
    return json({source,chunks:data});
  }
  if(action==='list'){
    const project=url.searchParams.get('project')||null;
    let query=db.from('mclain_brain_sources').select(FIELDS,{count:'exact'}).order('created_at',{ascending:false});
    if(project){const {data,error}=await db.from('mclain_brain_links').select('source_id').eq('project_id',project);check(error);
      if(!data.length)return json({sources:[],projects:await projects(db),total:0});query=query.in('id',data.map((l:any)=>l.source_id));}
    const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
    const {data,error,count}=await query.range(offset,offset+39);check(error);
    return json({sources:data,projects:await projects(db),total:count});
  }
  throw new HttpError('Unknown request.');
}
async function write(req:Request,db:any){
  if(req.headers.get('content-type')?.includes('multipart/form-data'))return upload(req,db);
  const raw=await bytes(req,1100000);let body:any;
  try{body=JSON.parse(new TextDecoder().decode(raw));}catch{throw new HttpError('Invalid request.');}
  const action=body?.action;
  if(action==='search'){
    await rate(db,'search',30);
    if(typeof body.query!=='string'||!body.query.trim()||body.query.length>1000)throw new HttpError('Search is required and must stay under 1000 characters.');
    const project=await validProject(db,body.project);
    const {data,error}=await db.rpc('mclain_brain_search',{p_query:body.query,p_project:project});check(error);
    return json({passages:data||[]});
  }
  await rate(db,'write',60);
  const id=String(body?.id||'');await getSource(db,id);
  if(action==='link'){
    const project=await validProject(db,body.project);
    if(!project)throw new HttpError('Choose a project.');
    await link(db,id,project);await event(db,'knowledge.linked',id,project);return json({ok:true});
  }
  if(action==='claim'){
    const {data,error}=await db.rpc('mclain_brain_claim',{p_id:id});check(error);
    return json({lease:data,source:await getSource(db,id)});
  }
  if(action==='finish'){
    if(!UUID.test(body.lease)||!['text','pdf-text','ai-transcription'].includes(body.method)||!Array.isArray(body.chunks)||body.chunks.length>256||body.chunks.some((c:any)=>typeof c.content!=='string'||!c.content.trim()||c.content.length>2400||typeof c.locator!=='string'||c.locator.length>100))throw new HttpError('Invalid extracted passages.');
    const {data,error}=await db.rpc('mclain_brain_finish',{p_id:id,p_lease:body.lease,p_chunks:body.chunks,p_method:body.method});check(error);
    if(!data)throw new HttpError('A newer processing attempt exists.',409);
    return json({ok:true});
  }
  if(action==='fail'){
    if(!UUID.test(body.lease)||!['failed','needs_text'].includes(body.status))throw new HttpError('Invalid processing status.');
    const {error}=await db.from('mclain_brain_sources').update({status:body.status,error:String(body.message||'Processing failed.').slice(0,300),lease_token:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',id).eq('lease_token',body.lease);check(error);
    return json({ok:true});
  }
  throw new HttpError('Unknown request.');
}

export default {fetch:withSupabase({auth:'none'},async(req,ctx)=>{
  // Custom auth is mandatory before any privileged database or object operation.
  if(!(await authorized(req)))return json({error:'Sign in first.'},401);
  try{
    if(req.method==='GET')return await read(req,ctx.supabaseAdmin);
    if(req.method==='POST')return await write(req,ctx.supabaseAdmin);
    return json({error:'Method not allowed.'},405);
  }catch(e){return json({error:e instanceof HttpError?e.message:'Knowledge storage is temporarily unavailable.'},e instanceof HttpError?e.status:500);}
})};
