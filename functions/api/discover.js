// Optional discovery source for Classic YouTube on Cloudflare Pages.
// It does not scrape YouTube, invoke undocumented endpoints, or invent videos.
// Configure YOUTUBE_API_KEY via the existing Cloudflare Pages secret.
const TOPIC_TERMS={
 gaming:["gameplay","video games","game review","video game walkthrough","let's play"],
 animation:["animation","animated short film","cartoon","stop motion animation","flash animation"],
 music:["music video","live music","acoustic cover","band performance","music performance"],
 comedy:["comedy","funny videos","sketch comedy","parody","standup comedy"],
 science:["science experiment","space","nature science","physics demonstration","biology"],
 technology:["technology review","computer tutorial","gadget review","electronics","software tutorial"],
 education:["history documentary","educational video","lecture","how things work","learning"],
 sports:["sports highlights","skateboarding","football tricks","basketball","extreme sports"],
 animals:["cute animals","wildlife","cat","dog","animal documentary"],
 travel:["travel vlog","travel guide","city tour","adventure travel","road trip"],
 vlogs:["vlog","daily vlog","video diary","storytime","personal video"],
 arts:["drawing","painting","art tutorial","crafting","sculpture"],
 howto:["how to","DIY","cooking tutorial","repair tutorial","craft tutorial"],
 film:["short film","independent film","film review","movie trailer","cinematography"],
 culture:["internet culture","interview","documentary","web series","popular culture"]
};
const LANES=new Set(["familiar","adjacent","general","obscure"]);
const ID=/^[A-Za-z0-9_-]{11}$/;
const output=(body,status=200,seconds=0)=>new Response(JSON.stringify(body),{status,headers:{
 "content-type":"application/json;charset=utf-8","x-content-type-options":"nosniff",
 "cache-control":seconds?"public,max-age="+seconds:"no-store"
}});
const hash=str=>{
 let h=2166136261>>>0;
 for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
};
async function callYouTube(path,params,key){
 const url=new URL("https://www.googleapis.com/youtube/v3/"+path);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 url.searchParams.set("key",key);
 const response=await fetch(url.toString(),{headers:{"accept":"application/json"},signal:AbortSignal.timeout(11000)});
 let body;try{body=await response.json()}catch{throw new Error("YouTube returned an invalid response")}
 if(!response.ok){
  const reason=body?.error?.errors?.[0]?.reason||"service_unavailable";
  if(reason==="quotaExceeded"||reason==="dailyLimitExceeded")throw new Error("YouTube discovery quota reached");
  throw new Error("YouTube discovery unavailable ("+reason+")");
 }
 return body;
}
export async function onRequestGet({request,env}){
 const params=new URL(request.url).searchParams;
 const key=env?.YOUTUBE_API_KEY;
 if(!key)return output({error:"A YouTube Data API key has not yet been configured.",code:"not_configured"},503);
 const topic=params.get("topic")||"culture",lane=params.get("lane")||"general";
 const year=Number(params.get("year")||2013),batch=Number(params.get("batch")||0);
 if(!Object.prototype.hasOwnProperty.call(TOPIC_TERMS,topic)||!LANES.has(lane)||
  !Number.isInteger(year)||year<2005||year>new Date().getUTCFullYear()||
  !Number.isInteger(batch)||batch<0||batch>8)return output({error:"Invalid discovery settings"},400);
 // Shared daily cohorts keep results stable for a browsing session and reuse
 // Cloudflare edge-cache entries between visitors, avoiding per-user search storms.
 const day=new Date().toISOString().slice(0,10);
 const canonical=new URL(request.url);
 canonical.search="";
 for(const [k,v] of Object.entries({batch:String(batch),day,lane,topic,year:String(year)}))canonical.searchParams.set(k,v);
 const cache=typeof caches!=="undefined"?caches.default:null;
 const cacheKey=new Request(canonical.toString(),{method:"GET"});
 try{
  if(cache){const found=await cache.match(cacheKey);if(found)return found}
  const terms=TOPIC_TERMS[topic];
  const salt=hash([topic,lane,batch,day].join(":"));
  const term=terms[salt%terms.length];
  // The target period ends in 2013 by default; vary the older upload-window
  // across source cohorts to prevent every request finding only popular 2013 videos.
  const early=2005,range=Math.max(1,year-early+1);
  const start=early+((salt>>>3)%range);
  const end=Math.min(year,start+2);
  const args={
   part:"snippet",type:"video",q:term,order:lane==="obscure"?"date":"relevance",
   maxResults:40,videoEmbeddable:"true",safeSearch:"moderate",
   publishedAfter:start+"-01-01T00:00:00Z",
   publishedBefore:(end+1)+"-01-01T00:00:00Z"
  };
  const search=await callYouTube("search",args,key);
  const raw=(search.items||[]).filter(x=>ID.test(x.id?.videoId||"")&&x.snippet?.publishedAt)
   .filter(x=>{const y=new Date(x.snippet.publishedAt).getUTCFullYear();return y>=start&&y<=end&&y<=year});
  let details=new Map();
  if(raw.length){
   const more=await callYouTube("videos",{
    part:"snippet,contentDetails,statistics,status",id:raw.map(v=>v.id.videoId).join(",")
   },key);
   details=new Map((more.items||[]).filter(x=>x.status?.embeddable!==false&&x.status?.privacyStatus==="public").map(x=>[x.id,x]));
  }
  const items=raw.filter(x=>details.has(x.id.videoId)).map(x=>{
   const detail=details.get(x.id.videoId);
   return {
    id:{videoId:x.id.videoId},
    snippet:{
     title:x.snippet.title||"",
     channelTitle:x.snippet.channelTitle||"",
     channelId:x.snippet.channelId||"",
     publishedAt:x.snippet.publishedAt||"",
     description:detail.snippet?.description||x.snippet.description||"",
     tags:Array.isArray(detail.snippet?.tags)?detail.snippet.tags.slice(0,30):[]
    },
    views:detail.statistics?.viewCount==null?null:Number(detail.statistics.viewCount),
    likes:detail.statistics?.likeCount==null?null:Number(detail.statistics.likeCount),
    duration:detail.contentDetails?.duration||null,
    sourceLane:lane,sourceTopic:topic
   };
  });
  const payload={items,year,source:"youtube-data-api",sourceLane:lane,sourceTopic:topic,
   partial:true,hasMore:!!search.nextPageToken,
   windowStart:String(start),windowEnd:String(end)};
  const res=output(payload,200,86400);
  if(cache)await cache.put(cacheKey,res.clone());
  return res;
 }catch(e){
  return output({error:e?.message||"Discovery unavailable",code:"upstream_unavailable"},503);
 }
}