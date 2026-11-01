// Optional read-only shared archive. Set SCENE_DB D1 binding and apply migrations.
// Unconfigured deployments remain functional through their local IndexedDB archive.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const cap=(raw,min,max,fallback)=>{const n=Number(raw);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:fallback};
const mapThread=(row,posts)=>({
 id:row.id,sourceUrl:row.source_url,title:row.title,source:row.source,board:row.board,
 date:row.thread_date,year:row.year,origin:"shared",dataOrigin:row.origin,excerptOnly:!!row.excerpt_only,
 captureUrl:row.capture_url||null,tags:JSON.parse(row.tags_json||"[]"),
 posts:posts.filter(p=>p.thread_id===row.id).map(p=>({
  id:p.id,author:p.author,date:p.post_date,text:p.body,kind:p.kind,
  recommended:JSON.parse(p.recommended_json||"[]"),likedArtists:JSON.parse(p.liked_json||"[]"),origin:p.origin
 }))
});
export async function onRequestGet({request,env}){
 if(!env.SCENE_DB)return json({configured:false,threads:[],message:"Shared archive is not enabled. Local archives remain available."});
 const q=new URL(request.url).searchParams,mode=q.get("mode")||"recent";
 try{
  if(mode==="status"){
   const row=await env.SCENE_DB.prepare("SELECT count(*) AS n FROM archive_threads").first();
   return json({configured:true,count:row?.n||0});
  }
  const limit=cap(q.get("limit"),1,100,30),offset=cap(q.get("offset"),0,10000,0);
  let query,bindings;
  if(mode==="recent"){
   query="SELECT * FROM archive_threads ORDER BY thread_date DESC, id DESC LIMIT ? OFFSET ?";
   bindings=[limit,offset];
  }else if(mode==="search"){
   const term=(q.get("q")||"").trim().slice(0,100);
   const tokens=(term.toLowerCase().match(/[a-z0-9]{2,}/g)||[]).slice(0,8);
   if(!tokens.length)return json({configured:true,threads:[],mode});
   const expression=tokens.map(t=>'"'+t+'"').join(" AND ");
   query="SELECT DISTINCT t.* FROM archive_threads t JOIN archive_posts p ON p.thread_id=t.id JOIN posts_fts ON posts_fts.post_id=p.id WHERE posts_fts MATCH ? ORDER BY t.thread_date DESC LIMIT ? OFFSET ?";
   bindings=[expression,limit,offset];
  }else if(mode==="thread"){
   const id=(q.get("id")||"").slice(0,150);
   query="SELECT * FROM archive_threads WHERE id=?";bindings=[id];
  }else return json({error:"Unknown archive mode."},400);
  const selected=await env.SCENE_DB.prepare(query).bind(...bindings).all();
  const rows=selected.results||[];
  if(!rows.length)return json({configured:true,threads:[],mode,limit,offset});
  const marks=rows.map(()=>"?").join(",");
  const fetched=await env.SCENE_DB.prepare("SELECT * FROM archive_posts WHERE thread_id IN ("+marks+") ORDER BY post_date,id").bind(...rows.map(t=>t.id)).all();
  return json({configured:true,threads:rows.map(r=>mapThread(r,fetched.results||[])),mode,limit,offset});
 }catch(e){
  return json({error:"Shared archive temporarily unavailable. Local browsing still works.",code:"d1_unavailable"},503);
 }
}
