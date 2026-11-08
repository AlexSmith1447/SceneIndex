// Third-party, optional dislike estimates for the classic YouTube visual ratio.
// The current YouTube Data API does NOT expose public dislike counts.
// These estimates are from Return YouTube Dislike, NOT YouTube and NOT 2013.
// Attribution is mandatory: https://returnyoutubedislike.com/docs/usage-rights
const output=(body,status=200,age=0)=>new Response(JSON.stringify(body),{status,headers:{
 "content-type":"application/json;charset=utf-8","cache-control":age?"public,max-age="+age:"no-store","x-content-type-options":"nosniff"
}});
export async function onRequestGet({request}){
 const id=new URL(request.url).searchParams.get("id")||"";
 if(!/^[A-Za-z0-9_-]{11}$/.test(id))return output({error:"Invalid video ID"},400);
 const cache=typeof caches!=="undefined"?caches.default:null;
 const cachedKey=new Request(new URL(request.url).origin+"/api/ratings?id="+encodeURIComponent(id));
 try{
  if(cache){const cached=await cache.match(cachedKey);if(cached)return cached}
  const upstream=new URL("https://returnyoutubedislikeapi.com/votes");
  upstream.searchParams.set("videoId",id);
  const r=await fetch(upstream,{headers:{"accept":"application/json"},signal:AbortSignal.timeout(9500)});
  if(!r.ok)throw Error("Rating estimate not available");
  const data=await r.json();
  const likes=Number(data.likes),dislikes=Number(data.dislikes);
  if(!Number.isFinite(likes)||!Number.isFinite(dislikes)||likes<0||dislikes<0)throw Error("Invalid rating data");
  const res=output({likes,dislikes,source:"Return YouTube Dislike",estimated:true,yearSpecific:false,
   attribution:"https://returnyoutubedislike.com"},200,86400);
  if(cache)await cache.put(cachedKey,res.clone());
  return res;
 }catch{
  return output({error:"Estimated dislike data unavailable",code:"unavailable"},503);
 }
}