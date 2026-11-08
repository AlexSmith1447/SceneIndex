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
 if(!["search","channels","video","channel","comments","replies"].includes(mode))return out({error:"Unsupported operation"},400);
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
   const rawItems=(data.items||[]).filter(x=>ID.test(x.id?.videoId||"")).filter(x=>!year||new Date(x.snippet?.publishedAt).getUTCFullYear()<=year);
   const ids=rawItems.map(x=>x.id.videoId);
   let details=new Map();
   if(ids.length){
    try{
     const videoData=await upstream("videos",{part:"snippet,contentDetails,statistics,status",id:ids.join(",")},key);
     details=new Map((videoData.items||[]).filter(x=>x.status?.embeddable!==false).map(x=>[x.id,x]));
    }catch{}
   }
   const items=rawItems.filter(x=>!details.size||details.has(x.id.videoId)).map(x=>{
    const d=details.get(x.id.videoId);
    return {...x,duration:d?.contentDetails?.duration||null,views:d?.statistics?.viewCount?Number(d.statistics.viewCount):null,likes:d?.statistics?.likeCount?Number(d.statistics.likeCount):null,description:d?.snippet?.description||"",tags:Array.isArray(d?.snippet?.tags)?d.snippet.tags.slice(0,25):[]};
   });
   payload={items,source:"youtube-data-api",nextPageToken:data.nextPageToken||null};ttl=43200;
  }else if(mode==="channels"){
   const q=(p.get("q")||"").trim().slice(0,120);
   if(q.length<2)return out({error:"Enter at least two characters"},400);
   const args={part:"snippet",type:"channel",q,maxResults:20,order:"relevance",safeSearch:"moderate"};
   if(year)args.publishedBefore=(year+1)+"-01-01T00:00:00Z";
   const data=await upstream("search",args,key);
   const raw=(data.items||[]).filter(x=>x.id?.channelId&&x.snippet);
   const ids=raw.map(x=>x.id.channelId);
   let details=new Map();
   if(ids.length){
    try{const ch=await upstream("channels",{part:"statistics,snippet",id:ids.join(",")},key);
      details=new Map((ch.items||[]).map(x=>[x.id,x]))
    }catch{}
   }
   const items=raw.map(x=>{
    const d=details.get(x.id.channelId),stats=d?.statistics||{};
    return {channelId:x.id.channelId,name:x.snippet.title||"Unknown",thumbnail:x.snippet.thumbnails?.default?.url||"",videoCount:stats.videoCount?Number(stats.videoCount):null,subscribers:!stats.hiddenSubscriberCount&&stats.subscriberCount?Number(stats.subscriberCount):null}
   });
   payload={items};ttl=43200;
  }else if(mode==="video"){
   const id=p.get("id")||"";
   if(!ID.test(id))return out({error:"Invalid video ID"},400);
   const data=await upstream("videos",{part:"snippet,status,statistics,contentDetails",id},key);
   const item=data.items?.[0];
   if(!item||item.status?.embeddable===false)return out({error:"Video not found or cannot be embedded"},404);
   const x=cleanVideo(item);
   payload={video:{id,title:x.snippet.title,channel:x.snippet.channelTitle,channelId:x.snippet.channelId,year:x.year,date:x.snippet.publishedAt.slice(0,10),topic:"explore",tags:Array.isArray(item.snippet?.tags)?item.snippet.tags.slice(0,30):[],description:item.snippet?.description||"",categoryId:item.snippet?.categoryId||"",live:true,views:item.statistics?.viewCount==null?null:Number(item.statistics.viewCount),likes:item.statistics?.likeCount==null?null:Number(item.statistics.likeCount),commentCount:item.statistics?.commentCount==null?null:Number(item.statistics.commentCount),duration:item.contentDetails?.duration||null}};
   ttl=14400;
  }else if(mode==="channel"){
   const id=p.get("id")||"";
   if(!/^UC[A-Za-z0-9_-]{22}$/.test(id))return out({error:"Invalid channel ID"},400);
   const data=await upstream("channels",{part:"snippet,brandingSettings,statistics",id},key);
   const ch=data.items?.[0];
   if(!ch)return out({error:"Channel not found"},404);
   payload={channel:{channelId:id,name:ch.snippet?.title||"",avatar:ch.snippet?.thumbnails?.medium?.url||ch.snippet?.thumbnails?.default?.url||"",
    description:ch.snippet?.description||"",createdAt:ch.snippet?.publishedAt||"",
    banner:ch.brandingSettings?.image?.bannerExternalUrl||"",
    subscribers:ch.statistics?.hiddenSubscriberCount?null:ch.statistics?.subscriberCount==null?null:Number(ch.statistics.subscriberCount)}};
   ttl=86400;
  }else if(mode==="replies"){
   const parent=p.get("parent")||"",token=p.get("pageToken")||"";
   if(!/^[A-Za-z0-9_-]{8,200}$/.test(parent)||token.length>1024||!/^[A-Za-z0-9_\-=%]*$/.test(token))return out({error:"Invalid comment identifier"},400);
   const args={part:"snippet",parentId:parent,maxResults:100,textFormat:"plainText"};
   if(token)args.pageToken=token;
   const data=await upstream("comments",args,key);
   const comments=(data.items||[]).map(x=>({id:x.id,s:x.snippet})).filter(x=>x.s).map(x=>({
    id:x.id,parentId:parent,author:x.s.authorDisplayName||"Unknown",avatar:x.s.authorProfileImageUrl||"",authorUrl:x.s.authorChannelUrl||"",
    date:(x.s.publishedAt||"").slice(0,10),text:x.s.textDisplay||"",likes:x.s.likeCount??0,isReply:true
   })).filter(x=>x.date&&(!year||Number(x.date.slice(0,4))<=year));
   payload={items:comments,nextPageToken:data.nextPageToken||null};ttl=3600;
  }else{
   const id=p.get("id")||"",token=p.get("pageToken")||"",all=p.get("all")==="1";
   if(!ID.test(id))return out({error:"Invalid video ID"},400);
   if(!year)return out({error:"Historical year is required"},400);
   if(token.length>1024||!/^[A-Za-z0-9_\-=%]*$/.test(token))return out({error:"Invalid page token"},400);
   // The API does not offer "oldest first" ordering. Relevance can return
   // many modern comments on old videos; scan up to four separate pages per
   // click and expose a continuation rather than pretending only 3 survive.
   let next=token,scanned=0,calls=0,items=[];
   while(calls<(all?1:4)&&items.length<(all?65:28)){
    const args={part:"snippet,replies",videoId:id,maxResults:100,order:"relevance",textFormat:"plainText"};
    if(next)args.pageToken=next;
    const page=await upstream("commentThreads",args,key);
    calls++;scanned+=(page.items||[]).length;
    for(const thread of page.items||[]){
     const top=thread.snippet?.topLevelComment;
     const c=top?.snippet;
     if(!c?.publishedAt)continue;
     const date=c.publishedAt.slice(0,10);
     if(!all&&Number(date.slice(0,4))>year)continue;
     const replies=(thread.replies?.comments||[]).filter(x=>x?.snippet?.publishedAt)
      .filter(x=>all||Number(x.snippet.publishedAt.slice(0,4))<=year)
      .map(x=>({
       id:x.id,parentId:top.id,author:x.snippet.authorDisplayName||"Unknown",
       avatar:x.snippet.authorProfileImageUrl||"",authorUrl:x.snippet.authorChannelUrl||"",
       date:x.snippet.publishedAt.slice(0,10),text:x.snippet.textDisplay||"",
       likes:x.snippet.likeCount??0,isReply:true
      }));
     items.push({
      id:top.id,author:c.authorDisplayName||"Unknown",avatar:c.authorProfileImageUrl||"",
      authorUrl:c.authorChannelUrl||"",date,text:c.textDisplay||"",
      likes:c.likeCount??0,replyCount:Number(thread.snippet?.totalReplyCount)||0,
      replies
     });
    }
    next=page.nextPageToken||"";
    if(!next||scanned===0)break;
   }
   payload={items,nextPageToken:next||null,scanned,calls,partial:!!next,
    historical:!all,notice:"Top-level published comments and a subset of their available replies; deleted comments cannot be restored."};
   ttl=7200;

  }
  const response=out(payload,200,ttl);
  if(cache)await cache.put(cacheRequest,response.clone());
  return response;
 }catch(e){
  return out({error:e?.message||"YouTube data service is temporarily unavailable."},e?.status||502);
 }
}