// Cloudflare Pages Function. Optional YouTube Data API v3 integration.
// Configure YOUTUBE_API_KEY as an encrypted Cloudflare Pages secret.
// This endpoint does not access YouTube internal/private APIs.
const ID=/^[A-Za-z0-9_-]{11}$/;
const out=(body,status=200,age=0)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","x-content-type-options":"nosniff","cache-control":age?"public, max-age="+age:"no-store"}
});
function validYear(raw){
 const y=Number(raw);
 return Number.isInteger(y)&&y>=2005&&y<=new Date().getUTCFullYear()?y:null;
}
function cleanVideo(item){
 const s=item?.snippet||{};
 return {
  id:item.id,
  snippet:{title:s.title||"",channelTitle:s.channelTitle||"",channelId:s.channelId||"",publishedAt:s.publishedAt||"",description:s.description||""},
  year:s.publishedAt?new Date(s.publishedAt).getUTCFullYear():0
 };
}
async function upstream(path,params,key){
 const url=new URL("https://www.googleapis.com/youtube/v3/"+path);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 url.searchParams.set("key",key);
 const response=await fetch(url.toString(),{headers:{"accept":"application/json"},signal:AbortSignal.timeout(12000)});
 const data=await response.json();
 if(!response.ok){
  const reason=data?.error?.errors?.[0]?.reason||"upstream_error";
  const error=new Error(reason==="quotaExceeded"?"YouTube search quota has been exhausted. Try later.":"YouTube API request failed ("+reason+").");
  error.status=response.status===403?503:502;
  throw error;
 }
 return data;
}
export async function onRequestGet({request,env}){
 const url=new URL(request.url),p=url.searchParams,mode=p.get("mode")||"status",key=env?.YOUTUBE_API_KEY;
 if(mode==="status")return out({configured:!!key,provider:"YouTube Data API v3",searchAvailability:key?"enabled":"requires YOUTUBE_API_KEY"});
 if(!key)return out({error:"Full YouTube discovery isn't configured. Set YOUTUBE_API_KEY as a Cloudflare Pages secret.",code:"not_configured"},503);
 if(!["search","video","comments"].includes(mode))return out({error:"Unsupported operation"},400);
 const year=validYear(p.get("year"));
 try{
  // Public data is deliberately cached by request URL, never by API key.
  const cache=typeof caches!=="undefined"?caches.default:null;
  const cacheRequest=new Request(request.url,{method:"GET"});
  if(cache){const cached=await cache.match(cacheRequest);if(cached)return cached}
  let payload,ttl=3600;
  if(mode==="search"){
   const q=(p.get("q")||"").trim().slice(0,120);
   if(q.length<2)return out({error:"Enter at least two characters"},400);
   const args={part:"snippet",type:"video",q,videoEmbeddable:"true",maxResults:30,order:"relevance",safeSearch:"moderate"};
   if(year)args.publishedBefore=(year+1)+"-01-01T00:00:00Z";
   const data=await upstream("search",args,key);
   const items=(data.items||[]).filter(x=>ID.test(x.id?.videoId||"")).filter(x=>!year||new Date(x.snippet?.publishedAt).getUTCFullYear()<=year);
   payload={items,source:"youtube-data-api",nextPageToken:data.nextPageToken||null};ttl=43200;
  }else if(mode==="video"){
   const id=p.get("id")||"";
   if(!ID.test(id))return out({error:"Invalid video ID"},400);
   const data=await upstream("videos",{part:"snippet,status",id},key);
   const item=data.items?.[0];
   if(!item||item.status?.embeddable===false)return out({error:"Video not found or cannot be embedded"},404);
   const x=cleanVideo(item);
   payload={video:{id,title:x.snippet.title,channel:x.snippet.channelTitle,channelId:x.snippet.channelId,year:x.year,date:x.snippet.publishedAt.slice(0,10),topic:"explore",tags:[],live:true}};
   ttl=14400;
  }else{
   const id=p.get("id")||"";
   if(!ID.test(id))return out({error:"Invalid video ID"},400);
   if(!year)return out({error:"Historical year is required"},400);
   const data=await upstream("commentThreads",{part:"snippet",videoId:id,maxResults:100,order:"relevance",textFormat:"plainText"},key);
   const items=(data.items||[]).map(x=>x.snippet?.topLevelComment?.snippet).filter(Boolean).map(s=>({
    author:s.authorDisplayName||"Unknown",date:(s.publishedAt||"").slice(0,10),text:s.textOriginal||s.textDisplay||""
   })).filter(x=>x.date&&new Date(x.date+"T00:00:00Z")<new Date((year+1)+"-01-01T00:00:00Z")).slice(0,50);
   payload={items,partial:true,note:"A filtered sample of available top-level comments, not a historical archive."};ttl=14400;
  }
  const response=out(payload,200,ttl);
  if(cache)await cache.put(cacheRequest,response.clone());
  return response;
 }catch(e){
  return out({error:e?.message||"YouTube data service is temporarily unavailable."},e?.status||502);
 }
}