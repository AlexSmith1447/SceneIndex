// Public read-only historical forum lookup for approved live forums and Wayback captures.
// No arbitrary target/proxying. Never forward cookies, credentials or headers from callers.
// Availability of Wayback and source sites varies: errors are reported, not masked.
const allowed=new Set(["www.lpassociation.com","lpassociation.com","forum.chorus.fm","www.chorus.fm","chorus.fm"]);
const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const parseOrigin=(raw)=>{
 try {
  const u=new URL(raw);
  if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.hash||u.port)return null;
  if(u.hostname==="web.archive.org"){
   const match=u.pathname.match(/^\/web\/(\d{6,14})(?:id_)?\/(https?:\/\/.+)$/i);
   if(!match)return null;
   const o=new URL(match[2]);if(!["https:","http:"].includes(o.protocol)||o.username||o.password)return null;
   return {target:raw,original:o.href,archived:true,timestamp:match[1]};
  }
  if(!allowed.has(u.hostname.toLowerCase()))return null;
  return {target:u.href,original:u.href,archived:false,timestamp:null};
 }catch{return null}
};
async function retrieve(url,accept="text/html"){
 const r=await fetch(url,{method:"GET",redirect:"manual",headers:{"Accept":accept,"User-Agent":"SceneIndexArchive/0.2 (+https://sceneindex.pages.dev)"},signal:AbortSignal.timeout(10500)});
 if(!r.ok)throw Error("Upstream returned HTTP "+r.status);
 if(r.status>=300&&r.status<400)throw Error("Upstream redirects are not followed");
 const type=r.headers.get("content-type")||"";
 if(accept==="text/html"&&!/html|text\/plain/i.test(type))throw Error("Source did not return HTML");
 const length=Number(r.headers.get("content-length")||0);if(length>1800000)throw Error("Page exceeds 1.8 MB import limit");
 const reader=r.body?.getReader();if(!reader)throw Error("Empty response");
 const chunks=[];let size=0;
 try {
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1800000)throw Error("Page exceeds 1.8 MB import limit");chunks.push(value)}
 }finally{await reader.cancel().catch(()=>{})}
 const merged=new Uint8Array(size);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.length}
 return new TextDecoder().decode(merged);
}
export async function onRequestGet({request}){
 const q=new URL(request.url).searchParams,mode=q.get("mode")||"fetch",raw=q.get("url")||"";
 if(raw.length>1900)return respond({error:"URL is too long"},400);
 const source=parseOrigin(raw);
 if(!source)return respond({error:"This URL isn't supported for direct fetching. Use saved HTML or a Wayback capture URL. Direct fetch currently supports LP Association and Chorus only."},400);
 if(mode==="fetch"){
  try{const html=await retrieve(source.target);return respond({html,sourceUrl:source.original,captureUrl:source.archived?source.target:null,archived:source.archived,bytes:html.length})}
  catch(e){return respond({error:"Unable to fetch source: "+e.message+". Try a saved HTML file or another snapshot."},502)}
 }
 if(mode==="captures"){
  const original=source.original;
  const url=new URL("https://web.archive.org/cdx/search/cdx");
  url.searchParams.set("url",original);url.searchParams.set("output","json");url.searchParams.set("filter","statuscode:200");url.searchParams.set("filter","mimetype:text/html");url.searchParams.set("collapse","timestamp:4");url.searchParams.set("limit","25");
  try{
   const response=await fetch(url.toString(),{method:"GET",redirect:"manual",headers:{"Accept":"application/json","User-Agent":"SceneIndexArchive/0.2"},signal:AbortSignal.timeout(10500)});
   if(!response.ok)throw Error("Wayback index HTTP "+response.status);
   const json=await response.json();
   if(!Array.isArray(json))throw Error("Wayback returned an unexpected index");
   const captures=json.slice(1).filter(row=>Array.isArray(row)&&/^\d{14}$/.test(String(row[1]))).map(row=>({timestamp:row[1],date:row[1].slice(0,4)+"-"+row[1].slice(4,6)+"-"+row[1].slice(6,8),url:"https://web.archive.org/web/"+row[1]+"id_/"+original}));
   return respond({captures,original});
  }catch(e){return respond({error:"Wayback lookup unavailable: "+e.message+". You can still paste a direct capture URL or upload saved HTML."},502)}
 }
 return respond({error:"Unknown mode"},400);
}
