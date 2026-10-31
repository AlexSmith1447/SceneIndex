// Cloudflare Pages Function: public recent artists lookup; key never reaches browser.
// Configure LASTFM_API_KEY as a Cloudflare Pages encrypted secret.
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","X-Content-Type-Options":"nosniff","Cache-Control":"no-store"}});
export async function onRequestGet({request,env}){
 const q=new URL(request.url).searchParams;
 if(q.get("status")==="1")return output({configured:!!env.LASTFM_API_KEY});
 if(!env.LASTFM_API_KEY)return output({error:"Last.fm integration isn't configured yet. Import a scrobble CSV instead.",code:"not_configured"},503);
 const username=(q.get("user")||"").trim();
 if(!/^[a-zA-Z0-9_.-]{2,30}$/.test(username))return output({error:"Invalid Last.fm username."},400);
 const mode=q.get("mode")==="top"?"user.gettopartists":"user.getrecenttracks";
 const url=new URL("https://ws.audioscrobbler.com/2.0/");
 url.searchParams.set("method",mode);url.searchParams.set("user",username);
 url.searchParams.set("api_key",env.LASTFM_API_KEY);url.searchParams.set("format","json");
 url.searchParams.set("limit","200");
 if(mode==="user.gettopartists")url.searchParams.set("period","3month");
 try{
  const r=await fetch(url.toString(),{headers:{"User-Agent":"SceneIndex/0.1 (historical music discovery)","Accept":"application/json"},signal:AbortSignal.timeout(11000)});
  const data=await r.json();
  if(!r.ok||data.error)return output({error:data.message||"Last.fm request failed."},r.status>=400&&r.status<=499?400:502);
  const tracks=Array.isArray(data.recenttracks?.track)?data.recenttracks.track:[];
  const artists=mode==="user.gettopartists"?(data.topartists?.artist||[]).map(a=>({name:a.name,plays:Number(a.playcount)||0})):
    tracks.map(t=>({name:t.artist?.["#text"]||t.artist?.name||t.artist,plays:1}));
  return output({username,mode:mode==="user.gettopartists"?"top":"recent",artists:artists.filter(a=>typeof a.name==="string"&&a.name.length<180).slice(0,200)});
 }catch{return output({error:"Last.fm did not respond. Try a CSV import."},502)}
}
