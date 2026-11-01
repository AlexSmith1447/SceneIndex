// Protected archival publishing, opt-in when SCENE_DB and SCENE_ADMIN_TOKEN are set.
// Never accept unauthenticated archival writes; only the operator can publish reviewed material.
const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const cut=(x,n)=>String(x??"").trim().slice(0,n);
const validUrl=s=>{try{const u=new URL(s);return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password&&!u.port}catch{return false}};
const nameDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s);
const strList=(x,n=20)=>Array.isArray(x)?x.filter(v=>typeof v==="string").slice(0,n).map(v=>cut(v,90)):[];
const makeId=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return "pub-"+(h>>>0).toString(36)};
export async function onRequestPost({request,env}){
 if(!env.SCENE_DB||!env.SCENE_ADMIN_TOKEN)return result({error:"Private publication is not configured."},503);
 const token=request.headers.get("authorization")||"";
 if(token!=="Bearer "+env.SCENE_ADMIN_TOKEN)return result({error:"Unauthorized."},401);
 const contentLength=Number(request.headers.get("content-length")||0);
 if(contentLength>200000)return result({error:"Upload exceeds 200 KB."},413);
 let body;
 try{
  const raw=await request.text();if(raw.length>200000)throw Error("Too large");
  body=JSON.parse(raw);
 }catch{return result({error:"Invalid or oversized JSON."},400)}
 const candidates=Array.isArray(body?.threads)?body.threads:[body?.thread||body];
 if(candidates.length<1||candidates.length>4)return result({error:"Submit 1–4 threads per request."},400);
 const reviewed=body?.reviewed===true;
 if(!reviewed)return result({error:"Publication requires reviewed:true, confirming source and content have been checked."},400);
 const imported=[],skipped=[];
 for(const t of candidates){
  const sourceUrl=cut(t.sourceUrl,1000),title=cut(t.title,200),date=cut(t.date,10);
  if(!validUrl(sourceUrl)||!title||!nameDate(date)||!Array.isArray(t.posts)||!t.posts.length||t.posts.length>100)
   return result({error:"Every thread requires a valid public source URL, title, YYYY-MM-DD date, and 1–100 posts."},400);
  const key=sourceUrl.replace(/\/+$/,"").toLowerCase();
  const found=await env.SCENE_DB.prepare("SELECT id FROM archive_threads WHERE source_url=?").bind(key).first();
  if(found){skipped.push(sourceUrl);continue}
  const id=makeId(key),source=cut(t.source,120)||"Unknown source";
  const statements=[
   env.SCENE_DB.prepare("INSERT OR IGNORE INTO archive_threads (id,source_url,title,source,board,thread_date,year,tags_json,origin,excerpt_only,capture_url,date_basis) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
     .bind(id,key,title,source,cut(t.board,80)||"Other Music",date,Number(date.slice(0,4)),JSON.stringify(strList(t.tags,15)),cut(t.origin,30)||"reviewed-import",t.excerptOnly?1:0,validUrl(t.captureUrl)?cut(t.captureUrl,1000):null,["post","capture","unknown"].includes(t.dateBasis)?t.dateBasis:"post")
  ];
  for(let i=0;i<t.posts.length;i++){
   const p=t.posts[i],text=cut(p.text,10000),author=cut(p.author,80)||"Unknown",pDate=nameDate(p.date)?p.date:date;
   if(text.length<3)continue;
   const postId=id+"::"+i;
   statements.push(env.SCENE_DB.prepare("INSERT OR IGNORE INTO archive_posts (id,thread_id,author,post_date,body,kind,recommended_json,liked_json,origin) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(postId,id,author,pDate,text,cut(p.kind,30)||"discussion",JSON.stringify(strList(p.recommended)),JSON.stringify(strList(p.likedArtists)),cut(p.origin,30)||"reviewed-import"));
   statements.push(env.SCENE_DB.prepare("INSERT INTO posts_fts(body,thread_id,post_id) VALUES (?,?,?)").bind(text,id,postId));
  }
  try{await env.SCENE_DB.batch(statements);imported.push({id,title,sourceUrl})}
  catch{return result({error:"Database could not publish the reviewed material. Check schema and D1 limits.",imported,skipped},503)}
 }
 return result({published:imported.length,imported,skipped});
}
