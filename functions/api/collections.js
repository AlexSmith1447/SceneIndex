// Public catalogue lookup: Internet Archive item metadata, not Wayback page content.
// Search suggestions are not endorsed archives. Downloads remain on archive.org.
const out=(j,status=200)=>new Response(JSON.stringify(j),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=180","x-content-type-options":"nosniff"}});
const bounded=(v,n)=>String(v||"").trim().slice(0,n);
const idOk=id=>/^[a-zA-Z0-9_.-]{1,160}$/.test(id);
const searchable=filename=>/\.(?:zip|warc(?:\.gz|\.zst)?|html?|json|7z|tar(?:\.gz)?|rar)$/i.test(filename);
async function getJson(url){
 const r=await fetch(url,{headers:{"accept":"application/json","user-agent":"SceneIndex/0.3 (public collection catalogue)"},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error("Archive.org responded with HTTP "+r.status);
 return r.json();
}
export async function onRequestGet({request}){
 const params=new URL(request.url).searchParams,mode=params.get("mode")||"search";
 try{
  if(mode==="search"){
   const term=bounded(params.get("q"),80).replace(/[^a-zA-Z0-9 \-_.']/g," ").trim();
   if(term.length<2)return out({items:[],total:0});
   const words=term.split(/\s+/).filter(Boolean).slice(0,6);
   const q=words.map(s=>'"'+s.replace(/"/g,"")+'"').join(" AND ");
   const url=new URL("https://archive.org/advancedsearch.php");
   url.searchParams.set("q",q);
   url.searchParams.set("output","json");url.searchParams.set("rows","20");url.searchParams.set("page","1");
   for(const field of ["identifier","title","description","year","date","creator","mediatype"])url.searchParams.append("fl[]",field);
   const data=await getJson(url);
   const docs=(data.response?.docs||[]).filter(x=>idOk(x.identifier)).map(x=>({
    identifier:x.identifier,title:bounded(x.title||x.identifier,190),description:bounded(Array.isArray(x.description)?x.description.join(" "):x.description,280),
    year:bounded(x.year||x.date,20),creator:bounded(Array.isArray(x.creator)?x.creator.join(", "):x.creator,90),
    detailUrl:"https://archive.org/details/"+x.identifier
   }));
   return out({items:docs,total:Number(data.response?.numFound)||0,term});
  }
  if(mode==="files"){
   const id=params.get("id")||"";
   if(!idOk(id))return out({error:"Invalid archive identifier"},400);
   const data=await getJson("https://archive.org/metadata/"+encodeURIComponent(id));
   if(!data.metadata)return out({error:"Archive item not found"},404);
   const files=(data.files||[]).filter(x=>typeof x.name==="string"&&searchable(x.name)&&x.private!==true&&x.private!=="true").slice(0,160).map(f=>({
    name:f.name,size:Number(f.size)||0,format:bounded(f.format,70),source:f.source||"",
    downloadUrl:"https://archive.org/download/"+encodeURIComponent(id)+"/"+f.name.split("/").map(encodeURIComponent).join("/")
   }));
   return out({identifier:id,title:bounded(data.metadata.title||id,180),files,
      detailUrl:"https://archive.org/details/"+id,
      note:"These files are listed in public metadata; actual download rights and availability are determined by Internet Archive."});
  }
  return out({error:"Unknown mode"},400);
 }catch(e){return out({error:"Internet Archive catalogue lookup unavailable: "+e.message},502)}
}
