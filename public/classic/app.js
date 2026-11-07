import {seedVideos,topics,stableKey,isValidId,videoFromUrl,isBefore,thumbnail,normalizeSearchItem} from "./catalog.js";

const $=s=>document.querySelector(s);
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const store=(key,value)=>{try{localStorage.setItem(stableKey+"."+key,JSON.stringify(value))}catch{}};
const load=(key,fallback)=>{try{const v=localStorage.getItem(stableKey+"."+key);return v?JSON.parse(v):fallback}catch{return fallback}};
const defaults={year:2013,time:true,discovery:"balanced",shorts:true,historic:true,comments:true};
const settings={...defaults,...load("settings",{})};
const state={
 settings,username:load("username","WesleyPigeon330"),page:"home",query:"",
 known:{...load("known",{})},saved:load("saved",[]),history:load("history",[]),
 subscriptions:load("subscriptions",[]),results:[],discovered:[],
 selection:"",current:null,comments:[],commentsLoaded:false,watchTab:"about",
 topic:"",loading:false,api:false,notice:"",guideOpen:false,accountOpen:false,searchOpen:false,shuffle:0
};
if(!Array.isArray(state.saved))state.saved=[];
if(!Array.isArray(state.history))state.history=[];
if(!Array.isArray(state.subscriptions))state.subscriptions=[];
for(const v of seedVideos)if(!state.known[v.id])state.known[v.id]=v;

const yearOk=v=>!state.settings.time||(Number(v.year)>0&&isBefore(v,state.settings.year));
const unique=list=>list.filter((v,i)=>v&&isValidId(v.id)&&list.findIndex(w=>w?.id===v.id)===i);
const catalog=()=>unique([...state.discovered,...Object.values(state.known)]).filter(yearOk);
const seededOrder=v=>Array.from(String(v.id)).reduce((n,c)=>(n*29+c.charCodeAt(0))%65521,191+state.shuffle*311);
const ordered=list=>{
 const fav=new Set(state.history.slice(0,15).map(x=>state.known[x.id]?.topic).filter(Boolean));
 const mode=state.settings.discovery;
 return [...list].sort((a,b)=>{
  const val=v=>{
   const randomness=seededOrder(v)/65521;
   if(mode==="random")return randomness;
   const familiar=fav.has(v.topic)?0.28:0;
   return (mode==="familiar"?familiar*3:familiar)+randomness;
  };
  return val(b)-val(a)
 });
};
const channelFor=v=>String(v.channel||"Unknown");
const channelList=()=>[...new Set(catalog().map(channelFor))].sort();
const channelVideos=name=>catalog().filter(v=>channelFor(v)===name);
const isSaved=id=>state.saved.includes(id);
const isFollowed=name=>state.subscriptions.includes(name);
const dateText=v=>v.date?new Date(v.date+"T00:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}):v.year?String(v.year):"";
const card=(v,layout="grid")=>{
 const channel=channelFor(v),watched=state.history.some(x=>x.id===v.id);
 return '<div class="clip '+layout+(watched?' watched':'')+'">'+
  '<div class="mobile-activity"><span class="activity-avatar">'+escapeHTML(channel.charAt(0).toUpperCase())+'</span><strong>'+escapeHTML(channel)+'</strong> uploaded <span>'+escapeHTML(dateText(v))+'</span></div>'+
  '<button type="button" data-watch="'+v.id+'" class="clip-image" aria-label="Watch '+escapeHTML(v.title)+'">'+
  '<img loading="lazy" src="'+thumbnail(v.id)+'" alt="" onerror="this.style.opacity=.28">'+
  '<span class="watch-overlay">▶</span></button>'+
  '<div class="clip-copy"><button type="button" data-watch="'+v.id+'" class="clip-title">'+escapeHTML(v.title||"Untitled")+'</button>'+
  '<div class="clip-byline">by <button type="button" data-channel="'+escapeHTML(channel)+'">'+escapeHTML(channel)+'</button></div>'+
  '<div class="clip-detail">'+escapeHTML(dateText(v))+'</div></div>'+
  '<button type="button" class="clip-later" title="'+(isSaved(v.id)?"Remove from Watch later":"Watch later")+'" data-save="'+v.id+'">'+(isSaved(v.id)?"✓":"+ ")+'◷</button>'+
 '</div>';
};
const tiles=(list,style="grid")=>list.length?'<div class="clip-list '+style+'">'+list.map(x=>card(x,style)).join("")+'</div>':'<div class="blank">No videos found.</div>';
const line=(title,right="")=>'<div class="section-title"><strong>'+escapeHTML(title)+'</strong>'+(right?'<span>'+escapeHTML(right)+'</span>':"")+'</div>';
function guide(){
 const item=(label,page,symbol)=>'<button type="button" data-page="'+page+'" class="guide-link '+(state.page===page?'selected':'')+'"><span class="guide-icon">'+symbol+'</span>'+label+'</button>';
 const sub=state.subscriptions.slice(0,9).map(n=>'<button type="button" data-channel="'+escapeHTML(n)+'" class="guide-link"><span class="mini-avatar">'+escapeHTML(n.charAt(0).toUpperCase())+'</span><span class="guide-channel">'+escapeHTML(n)+'</span></button>').join("");
 $("#guide").innerHTML=
 '<div class="mobile-identity"><span class="account-avatar">'+escapeHTML(state.username.slice(0,1).toUpperCase())+'</span><strong>'+escapeHTML(state.username)+'</strong><button data-page="settings">▾</button></div>'+
 '<div class="guide-section first">'+
 item("What to watch","home","⌂")+item("My subscriptions","subscriptions","▤")+item("History","history","◷")+item("Watch later","saved","◴")+
 '</div><div class="guide-section">'+item("Browse channels","discover","▦")+
 '<div class="guide-caption">SUBSCRIPTIONS</div>'+sub+
 '<button class="guide-link manage" type="button" data-page="subscriptions"><span class="guide-icon">⊕</span>Manage subscriptions</button></div>'+
 '<div class="guide-section mobile-only">'+item("Settings","settings","⚙")+'</div>';
 $("#guide").classList.toggle("open",state.guideOpen);
 $("#guide-backdrop").hidden=!state.guideOpen;
}
function header(){
 $(".account-label").textContent=state.username;
 $(".account-avatar").textContent=state.username.slice(0,1).toUpperCase();
 $(".header-search input").value=state.query;
 $(".site-header").classList.toggle("search-open",state.searchOpen);
 $("#account-menu").hidden=!state.accountOpen;
 $("#account-menu").innerHTML='<div class="account-heading"><span class="account-avatar">'+escapeHTML(state.username.slice(0,1).toUpperCase())+'</span><strong>'+escapeHTML(state.username)+'</strong></div>'+
 '<button type="button" data-page="settings">YouTube settings</button><button type="button" data-page="history">History</button><button type="button" data-page="saved">Watch later</button>';
 document.title=state.page==="watch"&&state.current?state.current.title+" - YouTube":"YouTube";
}
function render(){
 header();guide();
 const main=$("#main");
 // Preserve the active video player across tab changes, saving and comment loads.
 if(state.page==="watch"&&state.current&&main.dataset.watchId===state.current.id&&main.querySelector(".watch-page")){
   const template=document.createElement("div");template.innerHTML=watchPage();
   for(const selector of [".watch-title-row",".watch-channel-line",".watch-toolbar",".watch-description",".desktop-comments",".mobile-watch-tabs",".mobile-suggested",".mobile-comments",".related-videos"]){
     const next=template.querySelector(selector),old=main.querySelector(selector);
     if(next&&old)old.replaceWith(next);
   }
   return;
 }
 main.dataset.watchId=state.page==="watch"&&state.current?state.current.id:"";
 switch(state.page){
  case "home":main.innerHTML=home();break;
  case "discover":main.innerHTML=browse();break;
  case "subscriptions":main.innerHTML=subscriptions();break;
  case "saved":main.innerHTML=listPage("Watch later",state.saved.map(id=>state.known[id]).filter(Boolean));break;
  case "history":main.innerHTML=listPage("History",state.history.map(x=>state.known[x.id]).filter(Boolean),true);break;
  case "search":main.innerHTML=searchPage();break;
  case "channel":main.innerHTML=channelPage();break;
  case "watch":main.innerHTML=watchPage();break;
  case "settings":main.innerHTML=settingsPage();break;
  default:main.innerHTML=home();
 }
}
function home(){
 const all=ordered(catalog());
 const first=all.slice(0,9),more=all.slice(9,18);
 const followed=all.filter(v=>isFollowed(channelFor(v)));
 const group=followed.length?followed.slice(0,6):all.filter(v=>v.topic==="animation"||v.topic==="gaming").slice(0,6);
 return '<div class="homepage"><div class="feed-header"><h1>What to watch</h1><button data-action="refresh" class="small-text-button">Refresh ↻</button></div>'+
 '<div class="desktop-feed-tabs"><span class="active-tab">Highlights</span><button type="button" data-page="subscriptions">Everything</button></div>'+
 (followed.length?'<section class="feed-section">'+line("From your subscriptions")+tiles(group.slice(0,6))+'</section>':"")+
 '<section class="feed-section primary">'+line("Recommended for you")+tiles(first)+'</section>'+
 (more.length?'<section class="feed-section">'+line("More videos")+tiles(more)+'</section>':"")+
 (!state.api?'<p class="quiet-hint">Search is limited to the videos currently available in this library. <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">YouTube ↗</a></p>':"")+
 '</div>';
}
const availableTopics=[
 {id:"gaming",name:"Gaming"},{id:"animation",name:"Film & Animation"},{id:"music",name:"Music"},
 {id:"internet",name:"Popular on YouTube"},{id:"weird",name:"Comedy"}
];
function browse(){
 const selected=state.topic;
 const list=ordered(catalog()).filter(v=>!selected||v.topic===selected);
 return '<div class="feed-header"><h1>Browse channels</h1><button data-action="refresh" class="small-text-button">Refresh ↻</button></div>'+
 '<div class="browse-tabs"><button data-topic="" class="'+(!selected?"active":"")+'">All categories</button>'+
 availableTopics.map(t=>'<button data-topic="'+t.id+'" class="'+(selected===t.id?'active':'')+'">'+t.name+'</button>').join("")+'</div>'+
 (state.api?'<div class="browse-search"><button type="button" class="classic-button" data-action="more-videos">'+(state.loading?'Loading…':'More videos')+'</button></div>':"")+
 (state.notice?'<p class="quiet-hint">'+escapeHTML(state.notice)+'</p>':"")+
 '<section class="feed-section">'+line(selected?availableTopics.find(x=>x.id===selected)?.name:"Videos")+tiles(list)+'</section>';
}
function subscriptions(){
 const names=state.subscriptions;
 const list=ordered(catalog().filter(v=>names.includes(channelFor(v))));
 return '<div class="feed-header"><h1>My subscriptions</h1></div>'+
 (names.length?'<p class="minor-line">Subscriptions: '+escapeHTML(names.join(", "))+'</p>'+tiles(list):'<div class="blank">You haven’t subscribed to any channels yet. Browse videos and subscribe to channels you like.</div>');
}
function listPage(title,list,canClear=false){
 return '<div class="feed-header"><h1>'+title+'</h1>'+(canClear?'<button data-action="clear-history" class="small-text-button">Clear watch history</button>':"")+'</div>'+
 tiles(unique(list).filter(yearOk),"rows");
}
function channelPage(){
 const name=state.selection;
 const list=channelVideos(name);
 return '<div class="channel-shell"><div class="channel-banner"></div><div class="channel-head"><div class="channel-avatar">'+escapeHTML((name||"?").charAt(0).toUpperCase())+'</div><div><h1>'+escapeHTML(name)+'</h1><div class="minor-line">Videos</div></div>'+
 '<button type="button" class="subscribe-button '+(isFollowed(name)?"subscribed":"")+'" data-subscribe="'+escapeHTML(name)+'">'+(isFollowed(name)?'✓ Subscribed':'+ Subscribe')+'</button></div>'+
 '<div class="channel-tabs"><span class="active-tab">Videos</span></div><div class="channel-videos">'+tiles(ordered(list))+'</div></div>';
}
function searchPage(){
 const q=state.query.toLowerCase();
 const local=catalog().filter(v=>(v.title+" "+v.channel+" "+(v.tags||[]).join(" ")).toLowerCase().includes(q));
 const items=unique([...state.results.filter(yearOk),...local]);
 return '<div class="search-head"><div class="feed-header"><h1>Search results</h1></div><div class="search-filter">'+
 '<button type="button" data-action="show-filters">☷ Filters</button><span>'+items.length+' videos</span></div></div>'+
 (state.notice?'<p class="quiet-hint">'+escapeHTML(state.notice)+'</p>':"")+
 (!state.api?'<p class="quiet-hint">Search within available videos. <a href="https://www.youtube.com/results?search_query='+encodeURIComponent(state.query)+'" target="_blank" rel="noopener noreferrer">Search on YouTube ↗</a></p>':"")+
 tiles(items,"rows");
}
function commentsArea(){
 if(!state.settings.comments)return '<p class="muted">Comments are disabled in settings.</p>';
 if(!state.api)return '<p class="muted">Comments are unavailable.</p>';
 if(!state.commentsLoaded)return '<button type="button" class="classic-button" data-action="load-comments" '+(state.loading?'disabled':'')+'>'+(state.loading?'Loading…':'Load comments')+'</button>';
 if(!state.comments.length)return '<p class="muted">No comments available.</p>';
 return '<div class="comment-list">'+state.comments.map(c=>'<div class="comment"><div class="comment-author">'+escapeHTML(c.author)+' <span>'+escapeHTML(c.date)+'</span></div><p>'+escapeHTML(c.text)+'</p></div>').join("")+'</div>';
}
function watchPage(){
 const v=state.current;if(!v)return home();
 const channel=channelFor(v);
 const related=ordered(catalog().filter(x=>x.id!==v.id)).slice(0,12);
 const iframe='<div class="video-player"><iframe title="YouTube video player" src="https://www.youtube-nocookie.com/embed/'+v.id+'?playsinline=1&rel=0" allow="encrypted-media;accelerometer;gyroscope;picture-in-picture;fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
 const subscribed=isFollowed(channel);
 const info='<div class="watch-title-row"><h1>'+escapeHTML(v.title||"Video")+'</h1></div>'+
 '<div class="watch-channel-line"><div class="video-channel-avatar">'+escapeHTML(channel.charAt(0).toUpperCase())+'</div>'+
 '<div class="watch-channel-name"><button data-channel="'+escapeHTML(channel)+'">'+escapeHTML(channel)+'</button>'+
 '<div class="watch-published">'+escapeHTML(dateText(v))+'</div></div>'+
 '<button data-subscribe="'+escapeHTML(channel)+'" class="subscribe-button '+(subscribed?'subscribed':'')+'">'+(subscribed?'✓ Subscribed':'+ Subscribe')+'</button></div>'+
 '<div class="watch-toolbar"><div class="watch-toolbar-left"><button class="'+(state.watchTab==="about"?'current':'')+'" data-tab="about">About</button><button data-tab="share">Share</button><button data-tab="add">Add to</button></div></div>';
 const about='<div class="description">'+(v.date?'<p>Published on '+escapeHTML(dateText(v))+'</p>':'')+
 (v.note?'<p>'+escapeHTML(v.note)+'</p>':"")+'</div>';
 const details=state.watchTab==="share"?'<div class="description"><input readonly aria-label="Video link" value="'+escapeHTML(location.href)+'"><button class="classic-button" data-action="copy-link">Copy</button></div>':
 state.watchTab==="add"?'<div class="description"><button class="classic-button" data-save="'+v.id+'">'+(isSaved(v.id)?'✓ Added to Watch later':'+ Watch later')+'</button></div>':about;
 return '<div class="watch-page"><div class="watch-main">'+iframe+
 '<div class="mobile-watch-tabs"><button data-tab="about" class="'+(state.watchTab==="about"?'selected':'')+'">About</button><button data-tab="suggested" class="'+(state.watchTab==="suggested"?'selected':'')+'">Suggested</button><button data-tab="comments" class="'+(state.watchTab==="comments"?'selected':'')+'">Comments</button></div>'+
 '<div class="watch-below">'+info+
 '<div class="watch-description '+(state.watchTab==="suggested"||state.watchTab==="comments"?'mobile-hidden':'')+'">'+details+'</div>'+
 '<div class="desktop-comments"><h2>All Comments</h2>'+commentsArea()+'</div>'+
 '<div class="mobile-suggested '+(state.watchTab==="suggested"?'tab-visible':'')+'">'+tiles(related,"rows")+'</div>'+
 '<div class="mobile-comments '+(state.watchTab==="comments"?'tab-visible':'')+'">'+commentsArea()+'</div>'+
 '</div></div>'+
 '<aside class="related-videos">'+line("Suggestions")+tiles(related,"rows")+'</aside></div>';
}
function settingsPage(){
 const s=state.settings;
 const toggle=(key,title)=>'<label class="setting-item"><span>'+title+'</span><input type="checkbox" data-setting="'+key+'" '+(s[key]?'checked':'')+'></label>';
 return '<div class="feed-header"><h1>Settings</h1></div><div class="classic-settings">'+
 '<h2>Account</h2><label class="setting-item"><span>Username</span><input id="username-input" type="text" maxlength="32" value="'+escapeHTML(state.username)+'"></label>'+
 '<h2>Playback and discovery</h2><label class="setting-item"><span>Show videos through</span><select id="year-select">'+Array.from({length:22},(_,i)=>2005+i).map(y=>'<option value="'+y+'" '+(y===Number(s.year)?'selected':'')+'>'+y+'</option>').join("")+'</select></label>'+
 '<label class="setting-item"><span>Recommendations</span><select id="mode-select"><option value="balanced" '+(s.discovery==="balanced"?'selected':'')+'>Balanced</option><option value="familiar" '+(s.discovery==="familiar"?'selected':'')+'>Familiar</option><option value="random" '+(s.discovery==="random"?'selected':'')+'>Explore</option></select></label>'+
 toggle("time","Use video date filter")+toggle("shorts","Hide Shorts")+toggle("comments","Show older comments only")+
 '<h2>Appearance</h2>'+toggle("historic","Use archived channel artwork when available")+
 '<p class="fineprint">This username is a local profile for this site, not a Google or YouTube sign-in. Historical channel artwork is not available yet; the setting is reserved for later implementation.</p>'+
 '<p class="fineprint">Video search: '+(state.api?'Connected':'Limited until API access is configured')+'. <a href="https://github.com/AlexSmith1447/SceneIndex/blob/main/docs/CLASSIC_YOUTUBE.md" target="_blank" rel="noopener noreferrer">About this project</a></p>'+
 '</div>';
}
function toast(text){
 const el=$("#toast");el.textContent=text;el.hidden=false;
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.hidden=true},2300);
}
function collapseMenus(){state.guideOpen=false;state.accountOpen=false;state.searchOpen=false}
function navigate(page,query=null,{replace=false}={}){
 collapseMenus();state.page=page;state.notice="";state.watchTab="about";
 if(query!==null)state.query=query;
 const url=new URL(location.href);url.search="";
 if(page==="search")url.searchParams.set("q",state.query);
 else if(page==="channel")url.searchParams.set("c",state.selection);
 else if(page!=="home")url.searchParams.set("page",page);
 window.history[replace?"replaceState":"pushState"]({},"",url.pathname+url.search);
 window.scrollTo(0,0);render();
}
function watch(id,{replace=false}={}){
 if(!isValidId(id))return;
 const knownYear=Number(state.known[id]?.year)||0;
 if(state.settings.time&&knownYear>Number(state.settings.year)){toast("This video was uploaded later.");return}
 collapseMenus();state.current=state.known[id]||{id,title:"Video",channel:"Unknown channel",year:0};
 state.known[id]=state.current;store("known",state.known);
 state.page="watch";state.watchTab="about";state.comments=[];state.commentsLoaded=false;
 state.history=[{id},...state.history.filter(x=>x.id!==id)].slice(0,120);store("history",state.history);
 const url=new URL(location.href);url.search="";url.searchParams.set("v",id);
 window.history[replace?"replaceState":"pushState"]({},"",url.pathname+url.search);
 window.scrollTo(0,0);render();
 if(!Number(state.current.year)&&state.api)hydrate(id);
}
async function hydrate(id){
 try{const r=await fetch("../api/youtube?mode=video&id="+encodeURIComponent(id));const data=await r.json();
  if(r.ok&&data.video&&state.current?.id===id){
    state.known[id]=data.video;store("known",state.known);
    if(state.settings.time&&Number(data.video.year)>Number(state.settings.year)){
      navigate("home");toast("This video was uploaded later.");return;
    }
    state.current=data.video;render();
   }
 }catch{}
}
function save(id){
 if(state.saved.includes(id)){state.saved=state.saved.filter(x=>x!==id);toast("Removed from Watch later")}
 else{state.saved=[id,...state.saved].slice(0,150);toast("Added to Watch later")}
 store("saved",state.saved);render();
}
function subscribe(name){
 if(state.subscriptions.includes(name)){state.subscriptions=state.subscriptions.filter(x=>x!==name);toast("Unsubscribed")}
 else{state.subscriptions=[name,...state.subscriptions];toast("Subscribed")}
 store("subscriptions",state.subscriptions);render();
}
async function fetchSearch(query,isDiscovery=false){
 if(state.loading)return;
 state.loading=true;state.notice="";render();
 try{
  const url=new URL("../api/youtube",location.href);
  url.searchParams.set("mode","search");url.searchParams.set("q",query);
  if(state.settings.time)url.searchParams.set("year",String(state.settings.year));
  const r=await fetch(url);const data=await r.json();
  if(!r.ok)throw Error(data.error||"Search unavailable");
  const list=(data.items||[]).map(normalizeSearchItem).filter(Boolean).filter(yearOk);
  for(const v of list)state.known[v.id]=v;
  store("known",state.known);
  if(isDiscovery)state.discovered=unique([...state.discovered,...list]);
  else state.results=list;
  if(!list.length)state.notice="No results found.";
 }catch(e){state.notice=e.message||"Search unavailable"}
 finally{state.loading=false;render()}
}
async function fetchDiscovery(){
 if(!state.api){toast("Search is unavailable");return}
 const terms=state.topic?topics.find(x=>x.id===state.topic)?.terms||[]:topics.flatMap(x=>x.terms);
 if(!terms.length)return;
 const q=terms[state.shuffle%terms.length];state.shuffle++;
 await fetchSearch(q,true);
}
async function fetchComments(){
 if(state.loading||!state.current||!state.api)return;
 state.loading=true;render();
 try{
  const url=new URL("../api/youtube",location.href);
  url.searchParams.set("mode","comments");url.searchParams.set("id",state.current.id);
  url.searchParams.set("year",String(state.settings.year));
  const r=await fetch(url);const data=await r.json();
  if(!r.ok)throw Error(data.error||"Comments not available");
  state.comments=(data.items||[]).filter(c=>c.date&&Number(c.date.slice(0,4))<=state.settings.year);
  state.commentsLoaded=true;
 }catch(e){toast(e.message||"Could not load comments")}
 finally{state.loading=false;render()}
}
async function checkAPI(){
 try{const r=await fetch("../api/youtube?mode=status",{cache:"no-store"});if(r.ok){const j=await r.json();state.api=Boolean(j.configured)}}catch{}
 render();
}
async function searchSubmit(value){
 const term=value.trim();if(!term)return;
 const id=videoFromUrl(term)||(isValidId(term)?term:null);
 if(id){watch(id);return}
 state.results=[];state.query=term;navigate("search",term);if(state.api)await fetchSearch(term);
}
function route(){
 const u=new URL(location.href),id=u.searchParams.get("v"),q=u.searchParams.get("q"),c=u.searchParams.get("c");
 if(isValidId(id)){watch(id,{replace:true});return}
 if(c){state.selection=c;navigate("channel",null,{replace:true});return}
 if(q){state.query=q;navigate("search",q,{replace:true});if(state.api)fetchSearch(q);return}
 const p=u.searchParams.get("page");
 navigate(["home","discover","subscriptions","saved","history","settings"].includes(p)?p:"home",null,{replace:true});
}
document.addEventListener("click",async e=>{
 const el=e.target.closest("button[data-action],button[data-page],button[data-watch],button[data-save],button[data-subscribe],button[data-channel],button[data-tab],button[data-topic]");
 if(!el){if(state.accountOpen&&!e.target.closest("#account-menu")){state.accountOpen=false;header()}return}
 if(el.dataset.watch){watch(el.dataset.watch);return}
 if(el.dataset.save){save(el.dataset.save);return}
 if(el.dataset.subscribe){subscribe(el.dataset.subscribe);return}
 if(el.dataset.channel){state.selection=el.dataset.channel;navigate("channel");return}
 if(el.dataset.page){navigate(el.dataset.page);return}
 if(el.dataset.tab){state.watchTab=el.dataset.tab;render();return}
 if(el.hasAttribute("data-topic")){state.topic=el.dataset.topic;navigate("discover");return}
 switch(el.dataset.action){
  case "toggle-guide":state.guideOpen=!state.guideOpen;state.accountOpen=false;render();return;
  case "account":state.accountOpen=!state.accountOpen;state.guideOpen=false;render();return;
  case "mobile-search":state.searchOpen=!state.searchOpen;render();if(state.searchOpen)$("#search-input").focus();return;
  case "refresh":state.shuffle++;render();return;
  case "more-videos":await fetchDiscovery();return;
  case "clear-history":state.history=[];store("history",[]);render();return;
  case "load-comments":await fetchComments();return;
  case "show-filters":toast("Results are sorted by relevance and filtered by your selected year.");return;
  case "copy-link":try{await navigator.clipboard.writeText(location.href);toast("Link copied")}catch{toast("Copy failed")}return;
 }
});
$("#guide-backdrop").addEventListener("click",()=>{collapseMenus();render()});
$("#search-form").addEventListener("submit",e=>{e.preventDefault();searchSubmit($("#search-input").value)});
document.addEventListener("change",e=>{
 const el=e.target;
 if(el.id==="username-input"){const name=el.value.trim();if(name){state.username=name;store("username",name)}}
 else if(el.id==="year-select"){state.settings.year=Number(el.value);state.results=state.results.filter(yearOk);state.discovered=state.discovered.filter(yearOk)}
 else if(el.id==="mode-select")state.settings.discovery=el.value;
 else if(el.dataset.setting)state.settings[el.dataset.setting]=el.checked;
 else return;
 store("settings",state.settings);render();
});
let gesture=null;
document.addEventListener("touchstart",e=>{
 if(window.innerWidth>640||e.touches.length!==1)return;
 const t=e.touches[0];gesture={x:t.clientX,y:t.clientY};
},{passive:true});
document.addEventListener("touchend",e=>{
 if(!gesture||window.innerWidth>640||e.changedTouches.length!==1)return;
 const t=e.changedTouches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
 if(Math.abs(dy)>Math.abs(dx)*.65){gesture=null;return}
 if(!state.guideOpen&&gesture.x<28&&dx>65){state.guideOpen=true;render()}
 else if(state.guideOpen&&dx< -65){state.guideOpen=false;render()}
 gesture=null;
},{passive:true});
window.addEventListener("popstate",()=>{const u=new URL(location.href),id=u.searchParams.get("v");
 if(isValidId(id)){state.current=state.known[id]||{id,title:"Video",channel:"Unknown channel",year:0};state.page="watch"}
 else if(u.searchParams.has("c")){state.selection=u.searchParams.get("c");state.page="channel"}
 else if(u.searchParams.has("q")){state.query=u.searchParams.get("q");state.page="search"}
 else state.page=u.searchParams.get("page")||"home";
 collapseMenus();state.watchTab="about";render()
});
render();checkAPI().then(()=>{const url=new URL(location.href);if(url.searchParams.get("q")&&state.api)fetchSearch(url.searchParams.get("q"))});
route();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
