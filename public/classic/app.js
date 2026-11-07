import {seedVideos,topics,stableKey,isValidId,videoFromUrl,isBefore,thumbnail,normalizeSearchItem} from "./catalog.js";

const $=(sel)=>document.querySelector(sel);
const DEFAULT={year:2013,time:true,shorts:true,historic:true,comments:true,discovery:"balanced"};
function read(key,fallback){try{const raw=localStorage.getItem(stableKey+"."+key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function write(key,value){try{localStorage.setItem(stableKey+"."+key,JSON.stringify(value))}catch{}}
const initialYear=Number(read("settings",DEFAULT)?.year)||2013;
const state={
 settings:{...DEFAULT,...read("settings",DEFAULT),year:Math.max(2005,Math.min(2026,initialYear))},
 saved:read("saved",[]),history:read("history",[]),known:read("known",{}),
 page:"home",query:"",topic:"",liveResults:[],loading:false,notice:"",
 configured:false,checking:true,video:null,comments:[],commentsLoaded:false,
 iteration:0
};
if(!Array.isArray(state.saved))state.saved=[];
if(!Array.isArray(state.history))state.history=[];
if(typeof state.known!=="object"||!state.known)state.known={};
for(const v of seedVideos)state.known[v.id]=v;
const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const short=s=>String(s||"").length>130?String(s).slice(0,127)+"…":String(s||"");
const yearOf=v=>Number(v?.year)||0;
const yearEligible=v=>!state.settings.time||isBefore(v,state.settings.year);
const videos=()=>[...seedVideos,...state.liveResults,...Object.values(state.known)].filter((v,i,all)=>v&&isValidId(v.id)&&all.findIndex(x=>x?.id===v.id)===i&&yearEligible(v));
const shuffled=(list)=>list.slice().sort((a,b)=>{
 const score=(v)=>{
  const s=(state.history.findIndex(x=>x.id===v.id)+1);
  const topicScore=state.history.slice(0,12).filter(h=>state.known[h.id]?.topic===v.topic).length;
  const hash=[...v.id].reduce((n,c)=>((n*31+c.charCodeAt(0))|0),state.iteration*673+191);
  const random=((Math.abs(hash)%991)/991);
  return state.settings.discovery==="familiar"?topicScore*3+random:
   state.settings.discovery==="random"?random*5-(s>0?0.6:0):
   topicScore*0.45+random*2.6-(s>0?1/(s+2):0);
 };
 return score(b)-score(a)
});
const applyTopic=(list)=>state.topic?list.filter(v=>v.topic===state.topic||v.tags?.includes(state.topic)):list;
const unique=list=>list.filter((v,i)=>list.findIndex(t=>t.id===v.id)===i);
const sectionTitle=(title,meta="")=>'<div class="section-heading"><h2>'+clean(title)+'</h2>'+(meta?'<span>'+clean(meta)+'</span>':"")+'</div>';
function card(v,compact=false){
 const saved=state.saved.includes(v.id);
 const badge=v.date?clean(v.date):v.year?String(v.year):"Date unknown";
 return '<article class="video-card'+(compact?' compact':'')+'">'+
   '<button type="button" data-watch="'+v.id+'" class="video-thumb" aria-label="Watch '+clean(v.title)+'"><img loading="lazy" src="'+thumbnail(v.id)+'" alt="" onerror="this.style.opacity=.2"/><span class="thumb-play">▶</span></button>'+
   '<div class="video-details"><button type="button" data-watch="'+v.id+'" class="video-title">'+clean(short(v.title))+'</button><div class="video-channel">'+clean(v.channel||"Unknown uploader")+'</div><div class="video-date">'+badge+(v.live?' · YouTube search':'')+'</div>'+
   '<button type="button" class="save-mini" data-save="'+v.id+'" aria-label="'+(saved?'Remove saved video':'Save video')+'">'+(saved?'★ Saved':'☆ Save')+'</button></div></article>';
}
function cards(list,compact=false){return list.length?'<div class="video-grid'+(compact?' related':'')+'">'+list.map(v=>card(v,compact)).join("")+'</div>':'<div class="empty">No verified videos match the selected year or category.</div>'}
function banner(title,sub){return '<div class="page-head"><div><h1>'+clean(title)+'</h1><p>'+clean(sub)+'</p></div><span class="year-stamp">'+state.settings.year+'</span></div>'}
function home(){
 const list=shuffled(videos());
 const feature=list.find(v=>v.id==="AdYaTa_lOf4")||list[0];
 if(!feature)return banner("Your time capsule","No verified videos before this year.");
 const other=list.filter(v=>v.id!==feature.id);
 return banner("Welcome back to YouTube","A calmer way to explore videos from the early internet.")+
 '<section class="hero"><button class="hero-image" type="button" data-watch="'+feature.id+'"><img src="'+thumbnail(feature.id)+'" alt=""><span class="hero-play">▶</span></button>'+
 '<div class="hero-body"><span class="eyebrow">FEATURED · '+clean(String(feature.year||""))+'</span><h2>'+clean(feature.title)+'</h2><p>'+clean(feature.channel)+' · A video from the internet before everything became an endless feed.</p><button type="button" class="primary-button" data-watch="'+feature.id+'">Watch video ▶</button></div></section>'+
 sectionTitle("Recommended for you","Historical starter collection")+
 cards(other.slice(0,12))+
 '<div class="bottom-promo"><div><strong>There should be more to discover.</strong><p>Explore other topics or connect YouTube search to reach beyond this small verified starter collection.</p></div><button class="plain-button" type="button" data-page="discover">Explore →</button></div>';
}
function discover(){
 const list=shuffled(applyTopic(videos()));
 return banner("Discover","Balanced exploration, with room for unexpected finds.")+
 '<div class="discover-controls"><div class="topic-chips"><button type="button" data-topic="" class="'+(!state.topic?"selected":"")+'">All videos</button>'+
 topics.map(t=>'<button type="button" data-topic="'+t.id+'" class="'+(state.topic===t.id?"selected":"")+'">'+clean(t.name)+'</button>').join("")+'</div>'+
 '<div class="discovery-actions"><button type="button" class="plain-button" data-action="reshuffle">↻ Shuffle</button><button type="button" class="primary-button" data-action="fetch-discovery" '+(state.loading?'disabled':'')+'>'+(state.loading?'Searching…':state.configured?'Find more on YouTube':'Full search unavailable')+'</button></div></div>'+
 (state.notice?'<div class="notice">'+clean(state.notice)+'</div>':"")+
 (!state.configured?'<div class="hint">The video catalog can expand once a YouTube Data API key is configured in Cloudflare. Until then, discovery uses verified starter videos and saved links.</div>':"")+
 sectionTitle(state.topic?(topics.find(t=>t.id===state.topic)?.name||"Topic"):"From across YouTube",list.length+" available here")+
 cards(list);
}
function searchView(){
 const local=videos().filter(v=>{
  const value=(v.title+" "+v.channel+" "+(v.tags||[]).join(" ")).toLowerCase();
  return value.includes(state.query.toLowerCase());
 });
 const remote=state.liveResults.filter(v=>(!state.query)||yearEligible(v));
 const all=unique([...remote,...local]);
 return banner('Search: "'+state.query+'"',"Older videos first. Results are limited to videos still accessible.")+
 (state.notice?'<div class="notice">'+clean(state.notice)+'</div>':"")+
 (!state.configured?'<div class="hint">Full YouTube search is not configured yet. Showing matching starter and previously discovered videos. <a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query='+encodeURIComponent(state.query)+'">Search all of YouTube ↗</a></div>':"")+
 sectionTitle("Search results",String(all.length)+" matching videos")+cards(all);
}
function savedView(){
 const list=state.saved.map(id=>state.known[id]||{id,title:"Video "+id,channel:"Unknown",year:0}).filter(yearEligible);
 return banner("Saved videos","Your personal collection is stored on this device.")+cards(list);
}
function historyView(){
 const list=state.history.map(item=>state.known[item.id]||item).filter(v=>v&&isValidId(v.id)&&yearEligible(v));
 return banner("Recently watched","A quiet history, stored locally in your browser.")+
 '<div class="history-actions"><button type="button" class="plain-button" data-action="clear-history">Clear history</button></div>'+cards(list);
}
function watchView(){
 const v=state.video;
 if(!v)return home();
 const related=shuffled(videos().filter(x=>x.id!==v.id)).slice(0,8);
 const cutYear=Number(state.settings.year);
 const verified=Number(v.year)>0;
 const status=verified?'Published '+clean(v.date||String(v.year)):'Publication date unverified';
 const embed="https://www.youtube-nocookie.com/embed/"+v.id+"?playsinline=1&rel=0";
 return '<div class="watch-layout"><div class="watch-column">'+
 '<div class="player-frame"><iframe src="'+embed+'" title="YouTube video player" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'+
 '<h1 class="watch-title">'+clean(v.title||"YouTube video")+'</h1>'+
 '<div class="watch-meta">'+status+'<span class="dot"> · </span>'+clean(v.channel||"Unknown uploader")+'</div>'+
 '<div class="watch-actions"><button type="button" class="plain-button" data-save="'+v.id+'">'+(state.saved.includes(v.id)?'★ Saved':'☆ Save for later')+'</button>'+
 '<a class="plain-button" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v='+v.id+'">Open on YouTube ↗</a>'+
 '<button type="button" class="plain-button" data-action="copy-link">Copy link</button></div>'+
 (v.note?'<div class="watch-note">'+clean(v.note)+'</div>':"")+
 (!verified?'<div class="watch-note">This video was opened by URL. We have not verified whether it existed in '+cutYear+'. It is outside the authenticated historical catalog.</div>':"")+
 '<section class="comments"><div class="section-heading"><h2>Comments</h2><span>Historical view</span></div>'+
 (state.settings.comments?(
  state.commentsLoaded?(state.comments.length?'<div class="comment-list">'+state.comments.map(c=>'<div class="comment"><strong>'+clean(c.author)+'</strong><time>'+clean(c.date)+'</time><p>'+clean(c.text)+'</p></div>').join("")+'</div>':'<p>No accessible pre-'+cutYear+' comments returned.</p>'):
  state.configured?'<p>Only comments dated by the selected year are shown. Deleted or inaccessible comments cannot be recovered.</p><button class="plain-button" data-action="fetch-comments" '+(state.loading?'disabled':'')+'>'+(state.loading?'Loading…':'Load historical comments')+'</button>':
  '<p>Historical comments require the YouTube Data API integration. We won’t invent old conversations.</p>'
 ):'<p>Historical comment filtering is turned off.</p>')+
 '</section></div><aside class="related-column">'+sectionTitle("Related videos","")+cards(related,true)+'</aside></div>';
}
function settingsView(){
 const o=state.settings;
 return banner("Time Capsule settings","Choose how the historical experience behaves.")+
 '<div class="settings-panel"><div class="setting-row"><div><strong>Historical year</strong><small>When enabled, videos must have been published before the end of this year.</small></div><select id="yearSelect" aria-label="Historical year">'+
 Array.from({length:22},(_,i)=>2005+i).map(y=>'<option value="'+y+'" '+(y===Number(o.year)?"selected":"")+'>'+y+'</option>').join("")+'</select></div>'+
 '<div class="setting-row"><div><strong>Discovery behavior</strong><small>Balanced blends familiarity with broad exploration, but this first release uses a small catalog.</small></div><select id="discoverySelect"><option value="balanced" '+(o.discovery==="balanced"?"selected":"")+'>Balanced</option><option value="familiar" '+(o.discovery==="familiar"?"selected":"")+'>Familiar</option><option value="random" '+(o.discovery==="random"?"selected":"")+'>Rabbit holes</option></select></div>'+
 [
 ["time","Time Capsule filter","Hide verified videos published after the selected year."],
 ["shorts","Hide Shorts","Use classic cards and avoid the modern Shorts format."],
 ["historic","Historical identity mode","Ready for archived channel snapshots; modern metadata stays labeled until verified."],
 ["comments","Historical comments","Only fetch and show comments dated no later than the chosen year."]
 ].map(([key,title,description])=>'<label class="setting-row"><span><strong>'+title+'</strong><small>'+description+'</small></span><input type="checkbox" data-setting="'+key+'" '+(o[key]?'checked':'')+'></label>').join("")+
 '<div class="settings-note"><strong>Full YouTube search</strong><p>'+(state.configured?'Connected to YouTube Data API.':'Not configured. Add a <code>YOUTUBE_API_KEY</code> secret in the Cloudflare Pages environment to enable broader search and comments.')+'</p>'+
 '<p>The demo list is real but small. Historical avatars and comment retrieval are not claimed to work without archival data.</p></div>'+
 '<div class="setting-row"><div><strong>Storage</strong><small>Saved videos, history, and preferences remain on this device.</small></div><button type="button" class="plain-button" data-action="clear-history">Clear history</button></div></div>';
}
function render(){
 const main=$("#main");if(!main)return;
 $("#dateLabel").textContent=state.settings.time?"December "+state.settings.year:"All years";
 $(".topbar .brand small").textContent=state.settings.year;
 $("#searchInput").value=state.query;
 document.querySelectorAll("[data-page]").forEach(el=>el.classList.toggle("active",el.dataset.page===state.page));
 const current=state.page;
 main.innerHTML=current==="watch"?watchView():current==="settings"?settingsView():current==="discover"?discover():current==="saved"?savedView():current==="history"?historyView():current==="search"?searchView():home();
 if(!document.querySelector(".mobile-tabs")){
  const nav=document.createElement("nav");nav.className="mobile-tabs";nav.setAttribute("aria-label","Mobile navigation");
  nav.innerHTML='<button data-page="home"><b>⌂</b>Home</button><button data-page="discover"><b>✦</b>Explore</button><button data-page="saved"><b>★</b>Saved</button><button data-page="history"><b>◷</b>History</button><button data-page="settings"><b>⚙</b>Settings</button>';
  document.body.append(nav);
 }
 document.querySelectorAll(".mobile-tabs [data-page]").forEach(el=>el.classList.toggle("active",el.dataset.page===state.page));
}
function navigate(page,{replace=false}={}){
 state.page=page;state.notice="";state.comments=[];state.commentsLoaded=false;
 const u=new URL(location.href);
 u.search="";
 if(page==="search"&&state.query)u.searchParams.set("q",state.query);
 else if(page!=="home")u.searchParams.set("page",page);
 history[replace?"replaceState":"pushState"]({}, "",u.pathname+u.search);
 window.scrollTo(0,0);$("#sidebar")?.classList.remove("show");render();
}
function openVideo(id,{replace=false}={}){
 if(!isValidId(id))return;
 state.video=state.known[id]||{id,title:"YouTube video "+id,channel:"Unverified channel",year:0,date:null};
 state.known[id]=state.video;
 state.history=unique([{id},...state.history]).slice(0,80);
 write("history",state.history);write("known",state.known);
 state.comments=[];state.commentsLoaded=false;state.page="watch";state.notice="";
 const u=new URL(location.href);u.search="";u.searchParams.set("v",id);
 history[replace?"replaceState":"pushState"]({}, "",u.pathname+u.search);
 window.scrollTo(0,0);render();
 if(!yearOf(state.video)&&state.configured)hydrateVideo(id);
}
async function hydrateVideo(id){
 try{const response=await fetch("./../api/youtube?mode=video&id="+encodeURIComponent(id));const data=await response.json();
  if(response.ok&&data.video&&state.video?.id===id){
   state.video={...data.video};state.known[id]=state.video;write("known",state.known);render();
  }
 }catch{}
}
function toast(str){
 const el=$("#toast");el.textContent=str;el.classList.add("show");clearTimeout(toast.t);
 toast.t=setTimeout(()=>el.classList.remove("show"),2300);
}
function saveVideo(id){
 const i=state.saved.indexOf(id);
 if(i>=0){state.saved.splice(i,1);toast("Removed from saved videos");}
 else {state.saved.unshift(id);state.saved=state.saved.slice(0,100);toast("Saved to your library");}
 write("saved",state.saved);render();
}
async function requestSearch(query,{discovery=false}={}){
 if(state.loading)return;
 state.loading=true;state.notice="";render();
 try{
  const url=new URL("../api/youtube",location.href);
  url.searchParams.set("mode","search");url.searchParams.set("q",query);
  if(state.settings.time)url.searchParams.set("year",String(state.settings.year));
  const response=await fetch(url);
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"YouTube search is unavailable");
  const results=(data.items||[]).map(normalizeSearchItem).filter(Boolean).filter(yearEligible);
  results.forEach(v=>state.known[v.id]=v);write("known",state.known);
  state.liveResults=discovery?unique([...state.liveResults,...results]):results;
  state.notice=results.length?("Added "+results.length+" live YouTube results."):"No embeddable videos found in this search.";
 }catch(error){state.notice=error.message||"Search failed";}
 finally{state.loading=false;render()}
}
async function requestDiscovery(){
 if(!state.configured){toast("Connect a YouTube API key to broaden discovery");return}
 const topic=topics.find(x=>x.id===state.topic);
 const options=topic?.terms||topics.flatMap(x=>x.terms);
 const term=options[state.iteration%options.length];
 state.iteration++;await requestSearch(term,{discovery:true});
}
async function requestComments(){
 if(!state.video||!state.configured||state.loading)return;
 state.loading=true;render();
 try{
  const response=await fetch("../api/youtube?mode=comments&id="+encodeURIComponent(state.video.id)+"&year="+state.settings.year);
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Comments unavailable");
  state.comments=(data.items||[]).filter(c=>c?.date&&Number(c.date.slice(0,4))<=state.settings.year);
  state.commentsLoaded=true;
 }catch(error){toast(error.message||"Comments unavailable")}
 finally{state.loading=false;render()}
}
async function checkApi(){
 try{
  const response=await fetch("../api/youtube?mode=status",{cache:"no-store"});
  if(response.ok){const data=await response.json();state.configured=!!data.configured;}
 }catch{state.configured=false}
 state.checking=false;render();
}
function parseRoute(){
 const u=new URL(location.href);const id=u.searchParams.get("v");
 if(isValidId(id)){openVideo(id,{replace:true});return}
 const q=u.searchParams.get("q");const page=u.searchParams.get("page");
 if(q){state.query=q;state.page="search";render();if(state.configured)requestSearch(q);return}
 if(["home","discover","saved","history","settings"].includes(page)){state.page=page;render();return}
 navigate("home",{replace:true});
}
document.addEventListener("click",async e=>{
 const target=e.target.closest("button,[data-watch],[data-page],[data-topic],[data-save],[data-action]");
 if(!target)return;
 if(target.id==="brandHome"){navigate("home");return}
 if(target.id==="menuToggle"){$("#sidebar")?.classList.toggle("show");return}
 if(target.id==="settingsBtn"){navigate("settings");return}
 if(target.dataset.watch){openVideo(target.dataset.watch);return}
 if(target.dataset.save){saveVideo(target.dataset.save);return}
 if(target.hasAttribute("data-topic")){state.topic=target.dataset.topic;navigate("discover");return}
 if(target.dataset.page){navigate(target.dataset.page);return}
 if(target.dataset.action==="reshuffle"){state.iteration++;render();return}
 if(target.dataset.action==="fetch-discovery"){await requestDiscovery();return}
 if(target.dataset.action==="fetch-comments"){await requestComments();return}
 if(target.dataset.action==="copy-link"){try{await navigator.clipboard.writeText(location.href);toast("Link copied")}catch{toast("Could not copy link")}return}
 if(target.dataset.action==="clear-history"){state.history=[];write("history",[]);toast("History cleared");render();return}
});
$("#searchForm").addEventListener("submit",e=>{
 e.preventDefault();const raw=$("#searchInput").value.trim();
 if(!raw)return;
 const id=videoFromUrl(raw)||(/^[a-zA-Z0-9_-]{11}$/.test(raw)?raw:null);
 if(id){openVideo(id);return}
 state.query=raw;navigate("search");
 if(state.configured)requestSearch(raw);
});
document.addEventListener("change",e=>{
 const el=e.target;
 if(el.id==="yearSelect"){state.settings.year=Number(el.value)}
 else if(el.id==="discoverySelect"){state.settings.discovery=el.value}
 else if(el.dataset.setting){state.settings[el.dataset.setting]=el.checked}
 else return;
 write("settings",state.settings);state.liveResults=state.liveResults.filter(yearEligible);
 state.comments=[];state.commentsLoaded=false;render();
});
window.addEventListener("popstate",()=>{const u=new URL(location.href),id=u.searchParams.get("v");
 if(isValidId(id)){state.video=state.known[id]||{id,title:"YouTube video "+id,channel:"Unverified",year:0};state.page="watch";}
 else{state.page=u.searchParams.get("page")||((u.searchParams.get("q"))?"search":"home");state.query=u.searchParams.get("q")||"";}
 state.commentsLoaded=false;state.comments=[];render();
});
render();checkApi().then(()=>{const url=new URL(location.href),q=url.searchParams.get("q");if(q&&state.configured)requestSearch(q)});
parseRoute();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
