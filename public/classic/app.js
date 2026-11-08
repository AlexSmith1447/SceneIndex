import {seedVideos,topics,stableKey,isValidId,videoFromUrl,isBefore,thumbnail,normalizeSearchItem} from "./catalog.js";
import {rankFeed,LANES,selectSourceTopics,recordImpressions} from "./discovery.js";
import {recommendRelated,profileAffinity} from "./similarity.js";

const $=s=>document.querySelector(s);
const icon=(name,cls="")=>'<svg class="yt-icon '+cls+'" aria-hidden="true"><use href="./icons.svg#'+name+'"></use></svg>';
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const store=(key,value)=>{try{localStorage.setItem(stableKey+"."+key,JSON.stringify(value))}catch{}};
const load=(key,fallback)=>{try{const v=localStorage.getItem(stableKey+"."+key);return v?JSON.parse(v):fallback}catch{return fallback}};
const defaults={year:2013,time:true,discovery:"balanced",shorts:true,historic:true,comments:true};
const settings={...defaults,...load("settings",{})};
const cachedRecommendations=load("discoveryCacheV2",{year:0,expires:0,items:[]});
const usableCache=cachedRecommendations.year===settings.year&&cachedRecommendations.expires>Date.now()&&Array.isArray(cachedRecommendations.items);
const cachedPool=usableCache?cachedRecommendations.items:[];
const state={
 settings,username:load("username","WesleyPigeon330"),page:"home",query:"",
 known:{...load("known",{})},saved:load("saved",[]),history:load("history",[]),
 subscriptions:load("subscriptions",[]),reactions:load("reactions",{}),results:[],discovered:cachedPool,
 impressions:load("impressions",{}),loadingDiscovery:false,discoveryBatch:0,feedSize:36,discoveryError:"",
 lastRecommendationIds:[],loadCount:0,channelData:{},ratings:{},
 selection:"",current:null,comments:[],commentsLoaded:false,watchTab:"about",
 commentsPageToken:null,commentsAll:false,commentsScanned:0,commentsLoading:false,commentsError:"",
 descriptionExpanded:false,channelTab:"videos",
 searchTab:"videos",filterOpen:false,searchSort:"relevance",searchChannels:[],channelsQuery:"",
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
const formatViews=n=>Number.isFinite(Number(n))&&n!==undefined&&n!==null&&Number(n)>=0?Number(n).toLocaleString("en-US")+" views":"";
const searchEntries=()=>{
 const q=state.query.toLowerCase().trim();
 const local=catalog().filter(v=>(v.title+" "+v.channel+" "+(v.tags||[]).join(" ")).toLowerCase().includes(q));
 const list=unique([...state.results.filter(yearOk),...local]);
 if(state.searchSort==="date")list.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 if(state.searchSort==="views")list.sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0));
 return list;
};
const channelResults=()=>{
 const map=new Map();
 for(const v of searchEntries()){
  const name=channelFor(v),key=v.channelId||name;
  if(!map.has(key))map.set(key,{name,channelId:v.channelId||"",thumbnail:"",count:0,source:"video"});
  map.get(key).count++;
 }
 for(const ch of state.searchChannels)map.set(ch.channelId||ch.name,{...map.get(ch.channelId||ch.name),...ch,source:"channel"});
 return [...map.values()].filter(ch=>!state.query||ch.name.toLowerCase().includes(state.query.toLowerCase())||ch.source==="channel");
};
const channelList=()=>[...new Set(catalog().map(channelFor))].sort();
const channelVideos=name=>catalog().filter(v=>channelFor(v)===name);
const isSaved=id=>state.saved.includes(id);
const isFollowed=name=>state.subscriptions.includes(name);
const dateText=v=>v.date?new Date(v.date+"T00:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}):v.year?String(v.year):"";
const durationText=iso=>{
 if(!iso)return "";
 const p=/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso));
 if(!p)return /^\d+:\d\d$/.test(String(iso))?iso:"";
 const h=Number(p[1]||0),m=Number(p[2]||0),sec=Number(p[3]||0);
 return h?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
};
const relativeDate=v=>{
 if(!v.date)return dateText(v);
 const date=new Date(v.date+"T00:00:00Z").getTime(),cut=Date.UTC(Number(state.settings.year),11,31);
 const days=Math.max(0,Math.floor((cut-date)/86400000));
 if(days===0)return "today";
 if(days<7)return days+" day"+(days!==1?"s":"")+" ago";
 if(days<31)return Math.floor(days/7)+" weeks ago";
 if(days<365)return Math.floor(days/30)+" months ago";
 const y=Math.floor(days/365);return y+" year"+(y!==1?"s":"")+" ago";
};
const card=(v,layout="grid")=>{
 const channel=channelFor(v),watched=state.history.some(x=>x.id===v.id);
 return '<div class="clip '+layout+(watched?' watched':'')+'">'+
  '<div class="mobile-activity"><span class="activity-avatar">'+escapeHTML(channel.charAt(0).toUpperCase())+'</span><strong>'+escapeHTML(channel)+'</strong> uploaded <span>'+escapeHTML(relativeDate(v))+'</span></div>'+
  '<button type="button" data-watch="'+v.id+'" class="clip-image" aria-label="Watch '+escapeHTML(v.title)+'">'+
  '<img loading="lazy" src="'+thumbnail(v.id)+'" alt="" onerror="this.style.opacity=.28">'+
  (durationText(v.duration)?'<span class="thumb-duration">'+escapeHTML(durationText(v.duration))+'</span>':"")+
  '<span class="watch-overlay">'+icon("play")+'</span></button>'+
  '<div class="clip-copy"><button type="button" data-watch="'+v.id+'" class="clip-title">'+escapeHTML(v.title||"Untitled")+'</button>'+
  '<div class="clip-byline">by <button type="button" data-channel="'+escapeHTML(channel)+'">'+escapeHTML(channel)+'</button></div>'+
  '<div class="clip-detail">'+escapeHTML(formatViews(v.views)||dateText(v))+'</div></div>'+
  '<button type="button" class="clip-later" title="'+(isSaved(v.id)?"Remove from Watch later":"Watch later")+'" data-save="'+v.id+'">'+(isSaved(v.id)?icon("check"):icon("clock"))+'</button>'+
 '</div>';
};
const tiles=(list,style="grid")=>list.length?'<div class="clip-list '+style+'">'+list.map(x=>card(x,style)).join("")+'</div>':'<div class="blank">No videos found.</div>';
const line=(title,right="")=>'<div class="section-title"><strong>'+escapeHTML(title)+'</strong>'+(right?'<span>'+escapeHTML(right)+'</span>':"")+'</div>';
function guide(){
 const item=(label,page,symbol)=>'<button type="button" data-page="'+page+'" class="guide-link '+(state.page===page?'selected':'')+'"><span class="guide-icon">'+icon(symbol)+'</span>'+label+'</button>';
 const sub=state.subscriptions.slice(0,14).map(n=>'<button type="button" data-channel="'+escapeHTML(n)+'" class="guide-link"><span class="mini-avatar">'+escapeHTML(n.charAt(0).toUpperCase())+'</span><span class="guide-channel">'+escapeHTML(n)+'</span></button>').join("");
 const category=(name,topic,symbol)=>'<button type="button" data-topic="'+topic+'" class="guide-link category-link"><span class="guide-icon">'+icon(symbol)+'</span>'+escapeHTML(name)+'</button>';
 const desktop='<div class="desktop-guide-layout"><div class="guide-section first">'+
  item("What to watch","home","home")+item("My subscriptions","subscriptions","video")+item("History","history","history")+item("Watch later","saved","clock")+
  '</div><div class="guide-section">'+item("Browse channels","discover","channels")+
  '<div class="guide-caption">SUBSCRIPTIONS</div>'+sub+
  '<button class="guide-link manage" type="button" data-page="subscriptions"><span class="guide-icon">'+icon("plus")+'</span>Manage subscriptions</button></div></div>';
 const mobile='<div class="iphone-guide-layout">'+
  '<button type="button" data-page="settings" class="mobile-identity"><span class="account-avatar">'+escapeHTML(state.username.slice(0,1).toUpperCase())+'</span><strong>'+escapeHTML(state.username)+'</strong><span class="guide-expand">▾</span></button>'+
  '<div class="guide-section account-links">'+item("Settings","settings","gear")+item("Add Channels","discover","plus")+'</div>'+
  '<div class="guide-caption">Channels</div><div class="guide-section">'+item("Home Feed","home","home")+sub+'</div>'+
  '<div class="guide-caption">From YouTube</div><div class="guide-section">'+
  category("Popular","internet","popular")+category("Film & Animation","animation","film")+category("Autos & Vehicles","autos","auto")+
  category("Music","music","music")+category("Pets & Animals","pets","pets")+category("Sports","sports","sports")+
  category("Travel & Events","travel","travel")+category("Gaming","gaming","gaming")+category("People & Blogs","people","people")+
  '</div></div>';
 $("#guide").innerHTML=desktop+mobile;
 $("#guide").classList.toggle("open",state.guideOpen);
 $("#guide-backdrop").hidden=!state.guideOpen;
}
function header(){
 const detailTitle=state.page==="search"?state.query:state.page==="channel"?state.selection:
  state.page==="settings"?"Settings":state.page==="discover"?"Browse channels":
  state.page==="history"?"History":state.page==="saved"?"Watch later":
  state.page==="subscriptions"?"My subscriptions":"";
 $(".site-header").classList.toggle("detail-header",Boolean(detailTitle)||state.page==="watch");
 $(".site-header").classList.toggle("screen-title-header",Boolean(detailTitle));
 $("#mobile-screen-title").textContent=detailTitle;
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
   for(const selector of [".vintage-action-strip",".watch-numbers",".watch-title-row",".watch-channel-line",".watch-toolbar",".watch-description",".desktop-comments",".mobile-watch-tabs",".mobile-suggested",".mobile-comments",".related-videos"]){
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
 const discovered=state.discovered.filter(yearOk);
 const hasRealPool=state.api&&discovered.length>0;
 const pool=hasRealPool?discovered:catalog();
 const affinity=hasRealPool?profileAffinity(pool,state.history,state.known,state.reactions):new Map();
 const all=hasRealPool?rankFeed(pool,{
  year:state.settings.year,time:state.settings.time,limit:Math.min(110,Math.max(48,state.feedSize)),
  history:state.history,known:state.known,saved:state.saved,likes:state.reactions,affinity,
  impressions:state.impressions,subscriptions:state.subscriptions,rotation:state.shuffle
 }):ordered(pool);
 const visible=all.slice(0,state.feedSize);
 state.lastRecommendationIds=visible.slice(0,24).map(v=>v.id);
 const fromSubscriptions=hasRealPool&&state.subscriptions.length?
  visible.filter(v=>state.subscriptions.includes(v.channel)).slice(0,4):[];
 return '<div class="homepage"><div class="feed-header"><h1>What to watch</h1><button data-action="refresh" class="small-text-button">Refresh ↻</button></div>'+
  '<div class="desktop-feed-tabs"><span class="active-tab">Highlights</span><button type="button" data-page="subscriptions">Everything</button></div>'+
  (fromSubscriptions.length?'<section class="feed-section">'+line("From your subscriptions")+tiles(fromSubscriptions)+'</section>':"")+
  '<section class="feed-section primary">'+line(hasRealPool?"Recommended for you":"Videos")+
  (state.loadingDiscovery&&!hasRealPool?'<div class="feed-loading">Loading videos…</div>':tiles(visible))+'</section>'+
  (hasRealPool?'<div class="feed-next"><button class="classic-button" data-action="load-more" type="button" '+(state.loadingDiscovery?'disabled':'')+'>'+(state.loadingDiscovery?'Loading…':'Load more videos')+'</button></div>':"")+
  '</div>';
}
const availableTopics=[
 {id:"gaming",name:"Gaming"},{id:"animation",name:"Film & Animation"},{id:"music",name:"Music"},
 {id:"internet",name:"Popular on YouTube"},{id:"weird",name:"Comedy"}
];
function browse(){
 const selected=state.topic;
 const aliases={internet:"culture",weird:"comedy",autos:"technology",pets:"animals"};
 const topicId=aliases[selected]||selected;
 const list=ordered(catalog()).filter(v=>!selected||v.topic===topicId||v.topic===selected);
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
 const found=list.find(v=>v.channelId)?.channelId||((state.current&&state.current.channel===name)?state.current.channelId:null);
 const ch=found?state.channelData[found]:null;
 const avatar=ch?.avatar?'<img src="'+escapeHTML(ch.avatar)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':escapeHTML((name||"?").charAt(0).toUpperCase());
 const about=ch?
  '<section class="channel-about"><h2>About '+escapeHTML(ch.name||name)+'</h2><p>'+escapeHTML(ch.description||"No description available.")+'</p>'+
  (ch.createdAt?'<div>Joined '+escapeHTML(ch.createdAt.slice(0,10))+'</div>':"")+
  (ch.subscribers!=null?'<div>'+Number(ch.subscribers).toLocaleString()+' subscribers</div>':"")+
  '<small>Current public channel information; historical profile is not archived.</small></section>':
  '<section class="channel-about"><p>Channel details are unavailable.</p></section>';
 return '<div class="channel-shell"><div class="channel-banner"></div><div class="channel-head"><div class="channel-avatar">'+avatar+'</div><div><h1>'+escapeHTML(name)+'</h1><div class="minor-line">Videos</div></div>'+
 '<button type="button" class="subscribe-button '+(isFollowed(name)?"subscribed":"")+'" data-subscribe="'+escapeHTML(name)+'">'+(isFollowed(name)?icon("check")+' Subscribed':icon("plus")+' Subscribe')+'</button></div>'+
 '<div class="channel-tabs"><button type="button" data-channel-tab="videos" class="'+(state.channelTab==="videos"?"selected":"")+'">Videos</button><button type="button" data-channel-tab="about" class="'+(state.channelTab==="about"?"selected":"")+'">About</button></div>'+
 (state.channelTab==="about"?about:'<div class="channel-videos">'+tiles(ordered(list))+'</div>')+'</div>';
}
function searchPage(){
 const items=searchEntries();
 const channels=channelResults();
 const filterPopup=state.filterOpen?'<div class="search-filter-panel"><div class="filter-heading">Sort by</div>'+
  [["relevance","Relevance"],["date","Upload date"],["views","View count"]].map(([key,label])=>
   '<button type="button" data-sort="'+key+'" class="'+(state.searchSort===key?"selected":"")+'">'+(state.searchSort===key?icon("check"):"")+label+'</button>').join("")+
  '<div class="filter-caption">Videos published through '+escapeHTML(String(state.settings.year))+'</div></div>':"";
 const toolbar='<div class="search-mobile-controls"><div class="search-segment">'+
  '<button data-search-tab="videos" class="'+(state.searchTab==="videos"?"selected":"")+'">Videos</button>'+
  '<button data-search-tab="channels" class="'+(state.searchTab==="channels"?"selected":"")+'">Channels</button>'+
  '</div><button type="button" data-action="search-gear" class="search-filter-gear" aria-label="Search filters" aria-expanded="'+Boolean(state.filterOpen)+'">'+icon("gear")+'</button>'+filterPopup+'</div>';
 const resultCards=state.searchTab==="channels"?
  (channels.length?'<div class="channel-results">'+channels.map(c=>{
   const avatar=c.thumbnail&&/^https:\/\//.test(c.thumbnail)?'<img src="'+escapeHTML(c.thumbnail)+'" alt="">':escapeHTML((c.name||"?").charAt(0).toUpperCase());
   const subtitle=(c.videoCount!==undefined&&c.videoCount!==null?Number(c.videoCount).toLocaleString()+" videos":c.count?c.count+" videos":"");
   const subs=c.subscribers!==undefined&&c.subscribers!==null?Number(c.subscribers).toLocaleString()+" subscribers":"";
   return '<button type="button" class="channel-result" data-channel="'+escapeHTML(c.name)+'"><span class="channel-result-image">'+avatar+'</span>'+
    '<span class="channel-result-meta"><strong>'+escapeHTML(c.name)+'</strong><small>'+escapeHTML(subtitle)+'</small><small>'+escapeHTML(subs)+'</small></span>'+icon("chevron","result-chevron")+'</button>'
  }).join("")+'</div>':'<div class="blank">No channels found.</div>'):
  tiles(items,"rows");
 return '<div class="search-page">'+
  '<div class="search-head"><div class="feed-header"><h1>Search results for '+escapeHTML(state.query)+'</h1></div></div>'+
  toolbar+
  (state.notice?'<p class="quiet-hint">'+escapeHTML(state.notice)+'</p>':"")+
  (!state.api?'<p class="quiet-hint">Search available videos. <a href="https://www.youtube.com/results?search_query='+encodeURIComponent(state.query)+'" target="_blank" rel="noopener noreferrer">More results ↗</a></p>':"")+
  resultCards+'</div>';
}
function commentsArea(){
 if(!state.settings.comments)return '<p class="muted">Comments disabled in Settings.</p>';
 if(!state.api)return '<p class="muted">Comments unavailable.</p>';
 const controls='<div class="comment-controls">'+
  '<button type="button" data-action="comments-historical" class="'+(!state.commentsAll?'selected':'')+'">Older comments</button>'+
  '<button type="button" data-action="comments-all" class="'+(state.commentsAll?'selected':'')+'">All comments</button>'+
  '</div>';
 const row=c=>{
  const avatar=typeof c.avatar==="string"&&/^https:\/\//.test(c.avatar)?
   '<img class="comment-picture" loading="lazy" referrerpolicy="no-referrer" alt="" src="'+escapeHTML(c.avatar)+'" onerror="this.style.visibility='+"'hidden'"+'">':
   '<span class="comment-picture placeholder">'+escapeHTML((c.author||"?").charAt(0))+'</span>';
  const replies=(c.replies||[]).map(reply=>row({...reply,replies:[],replyCount:0,isReply:true})).join("");
  const rest=c.replyCount&&c.replyCount>(c.replies||[]).length?'<button type="button" class="comment-reply-link" data-replies="'+escapeHTML(c.id)+'">'+c.replyCount+' replies</button>':"";
  return '<div class="comment '+(c.isReply?'reply':'')+'">'+avatar+
   '<div class="comment-main"><div class="comment-author">'+escapeHTML(c.author)+' <span>'+escapeHTML(c.date)+'</span></div>'+
   '<p>'+escapeHTML(c.text)+'</p>'+
   (c.likes?'<div class="comment-likes">'+Number(c.likes).toLocaleString()+" likes</div>":"")+
   (replies?'<div class="comment-replies">'+replies+'</div>':"")+rest+'</div></div>';
 };
 const list=state.comments.length?'<div class="comment-list">'+state.comments.map(row).join("")+'</div>':
 '<p class="muted">'+(state.commentsLoading?'Finding comments…':state.commentsAll?"No comments returned.":"No older comments found on the pages checked.")+'</p>';
 const note=!state.commentsAll?'<p class="comment-hint">Only surviving comments published by '+state.settings.year+' are displayed. Older pages may contain more.</p>':"";
 const more=state.commentsPageToken?'<button type="button" class="classic-button comment-more" data-action="load-more-comments" '+(state.commentsLoading?'disabled':'')+'>'+(state.commentsLoading?'Loading…':'Load more comments')+'</button>':"";
 const loadInitial=!state.commentsLoaded?'<button type="button" class="classic-button comment-more" data-action="load-comments" '+(state.commentsLoading?'disabled':'')+'>'+(state.commentsLoading?'Loading…':'Load comments')+'</button>':"";
 return controls+note+list+loadInitial+more+(state.commentsError?'<p class="comment-error">'+escapeHTML(state.commentsError)+'</p>':"");
}
function watchPage(){
 const v=state.current;if(!v)return home();
 const channel=channelFor(v),related=recommendRelated(v,catalog(),{year:state.settings.year,time:state.settings.time,history:state.history,limit:14});
 const channelInfo=v.channelId?state.channelData[v.channelId]:null;
 const rating=state.ratings[v.id]||null;
 const totalRating=rating?rating.likes+rating.dislikes:0;
 const green=totalRating?Math.max(0,Math.min(100,Math.round((rating.likes/totalRating)*100))):0;
 const bar=totalRating?'<div class="vintage-rating"><div class="rating-bar" title="Estimated vote ratio from Return YouTube Dislike"><span class="rating-green" style="width:'+green+'%"></span><span class="rating-red" style="width:'+(100-green)+'%"></span></div>'+
  '<div class="rating-details"><span>'+Number(rating.dislikes).toLocaleString()+' estimated dislikes</span><a href="https://returnyoutubedislike.com" target="_blank" rel="noopener noreferrer">RYD estimate</a></div></div>':'';
 const iframe='<div class="video-player"><iframe title="YouTube video player" src="https://www.youtube-nocookie.com/embed/'+v.id+'?playsinline=1&rel=0" allow="encrypted-media;accelerometer;gyroscope;picture-in-picture;fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
 const subscribed=isFollowed(channel),react=state.reactions[v.id]||"";
 const actionStrip='<div class="vintage-action-strip">'+
  '<button type="button" class="'+(react==="like"?"pressed":"")+'" data-react="like" aria-label="Like video">'+icon("like")+'</button>'+
  '<button type="button" class="'+(react==="dislike"?"pressed":"")+'" data-react="dislike" aria-label="Dislike video">'+icon("dislike")+'</button>'+
  '<button type="button" data-action="share-video" aria-label="Share video">'+icon("share")+'</button></div>';
 const info='<div class="watch-title-row"><h1>'+escapeHTML(v.title||"Video")+'</h1></div>'+
 '<div class="watch-channel-line"><div class="video-channel-avatar">'+(channelInfo?.avatar?'<img src="'+escapeHTML(channelInfo.avatar)+'" loading="lazy" alt="" referrerpolicy="no-referrer">':escapeHTML(channel.charAt(0).toUpperCase()))+'</div>'+
 '<div class="watch-channel-name"><button data-channel="'+escapeHTML(channel)+'">'+escapeHTML(channel)+'</button>'+
 '<div class="watch-published">'+escapeHTML(dateText(v))+'</div></div>'+
 '<button data-subscribe="'+escapeHTML(channel)+'" class="subscribe-button '+(subscribed?'subscribed':'')+'">'+(subscribed?icon("check")+' Subscribed':icon("plus")+' Subscribe')+'</button></div>'+
 '<div class="watch-numbers"><div class="watch-likes">'+(v.likes!==null&&v.likes!==undefined?Number(v.likes).toLocaleString()+" likes":"")+'</div>'+
 (v.views!==null&&v.views!==undefined?'<div class="watch-views">'+Number(v.views).toLocaleString()+'<small>views</small></div>':"")+'</div>'+bar+
 '<div class="watch-toolbar"><div class="watch-toolbar-left"><button class="'+(state.watchTab==="about"?'current':'')+'" data-tab="about">About</button><button data-tab="share">Share</button><button data-tab="add">Add to</button></div></div>';
 const description=String(v.description||v.note||"").trim();
 const snippet=state.descriptionExpanded?description:description.slice(0,850);
 const about='<div class="description">'+
  (v.date?'<p class="description-date"><strong>Published on '+escapeHTML(dateText(v))+'</strong></p>':"")+
  (description?'<p class="video-description">'+escapeHTML(snippet)+(description.length>850&&!state.descriptionExpanded?'…':"")+'</p>'+
   (description.length>850?'<button type="button" class="description-more" data-action="expand-description">'+(state.descriptionExpanded?"Show less":"Show more")+'</button>':""):
  '<p class="muted">No description available.</p>')+
  (v.views!=null?'<div class="video-about-stat">'+Number(v.views).toLocaleString()+' views</div>':"")+
  (v.likes!=null?'<div class="video-about-stat">'+Number(v.likes).toLocaleString()+' likes</div>':"")+
  (rating?'<div class="video-about-stat">'+Number(rating.dislikes).toLocaleString()+' estimated dislikes <a href="https://returnyoutubedislike.com" target="_blank" rel="noopener noreferrer">(RYD)</a></div>':"")+
  '<div class="video-about-channel">Uploaded by <button type="button" data-channel="'+escapeHTML(channel)+'">'+escapeHTML(channel)+'</button></div>'+
  '</div>';
 const details=state.watchTab==="share"?'<div class="description"><input readonly aria-label="Video link" value="'+escapeHTML(location.href)+'"><button class="classic-button" data-action="copy-link">Copy</button></div>':
 state.watchTab==="add"?'<div class="description"><button class="classic-button" data-save="'+v.id+'">'+(isSaved(v.id)?icon("check")+' Added to Watch later':icon("plus")+' Watch later')+'</button></div>':about;
 return '<div class="watch-page"><div class="watch-main">'+actionStrip+iframe+
 '<div class="mobile-watch-tabs"><div class="watch-segmented"><button data-tab="about" class="'+(state.watchTab==="about"?'selected':'')+'">About</button><button data-tab="suggested" class="'+(state.watchTab==="suggested"?'selected':'')+'">Suggested</button><button data-tab="comments" class="'+(state.watchTab==="comments"?'selected':'')+'">Comments</button></div></div>'+
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
 '<p class="fineprint">Video discovery: '+(state.api?'Connected to YouTube search. Recommendations are selected from retrieved videos.':'Not connected. The homepage uses a small local fallback until the Cloudflare secret YOUTUBE_API_KEY is configured.')+'</p>'+
 (state.discoveryError?'<p class="fineprint">'+escapeHTML(state.discoveryError)+'</p>':"")+
 '<p class="fineprint"><a href="https://github.com/AlexSmith1447/SceneIndex/blob/main/docs/CLASSIC_YOUTUBE.md" target="_blank" rel="noopener noreferrer">About this project</a></p>'+
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
 state.commentsPageToken=null;state.commentsScanned=0;state.commentsAll=false;state.commentsError="";
 state.descriptionExpanded=false;
 state.history=[{id},...state.history.filter(x=>x.id!==id)].slice(0,120);store("history",state.history);
 const url=new URL(location.href);url.search="";url.searchParams.set("v",id);
 window.history[replace?"replaceState":"pushState"]({},"",url.pathname+url.search);
 window.scrollTo(0,0);render();
 if(state.api){
  if(!state.current.channelId||!state.current.description||state.current.views==null)hydrate(id);
  else hydrateChannel(state.current.channelId);
  if(window.innerWidth>640)fetchComments({reset:true});
 }
 hydrateRatings(id);
}
const channelPending=new Set(),ratingPending=new Set();
async function hydrate(id){
 try{
  const r=await fetch("../api/youtube?mode=video&id="+encodeURIComponent(id));
  const data=await r.json();
  if(r.ok&&data.video&&state.current?.id===id){
   const merged={...state.known[id],...data.video};
   state.known[id]=merged;store("known",state.known);
   if(state.settings.time&&Number(merged.year)>Number(state.settings.year)){
    navigate("home");toast("This video was uploaded later.");return;
   }
   state.current=merged;render();
   if(merged.channelId)hydrateChannel(merged.channelId);
  }
 }catch{}
}
async function hydrateChannel(channelId){
 if(!state.api||!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)||channelPending.has(channelId)||state.channelData[channelId])return;
 channelPending.add(channelId);
 try{
  const response=await fetch("../api/youtube?mode=channel&id="+encodeURIComponent(channelId));
  const data=await response.json();
  if(response.ok&&data.channel){state.channelData[channelId]=data.channel;render()}
 }catch{}
 finally{channelPending.delete(channelId)}
}
async function hydrateRatings(videoId){
 if(!isValidId(videoId)||ratingPending.has(videoId)||Object.prototype.hasOwnProperty.call(state.ratings,videoId))return;
 ratingPending.add(videoId);
 try{
  const response=await fetch("../api/ratings?id="+encodeURIComponent(videoId));
  const data=await response.json();
  state.ratings[videoId]=response.ok&&data?.estimated&&Number.isFinite(data.likes)&&Number.isFinite(data.dislikes)?data:null;
  if(state.current?.id===videoId)render();
 }catch{state.ratings[videoId]=null}
 finally{ratingPending.delete(videoId)}
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

async function fetchChannelSearch(query){
 if(state.loading||!state.api||!query)return;
 state.loading=true;state.channelsQuery=query;render();
 try{
  const url=new URL("../api/youtube",location.href);
  url.searchParams.set("mode","channels");url.searchParams.set("q",query);
  if(state.settings.time)url.searchParams.set("year",String(state.settings.year));
  const response=await fetch(url);const data=await response.json();
  if(!response.ok)throw Error(data.error||"Channels unavailable");
  state.searchChannels=(data.items||[]).map(ch=>({
   name:ch.name,channelId:ch.channelId,thumbnail:ch.thumbnail,
   videoCount:ch.videoCount,subscribers:ch.subscribers
  })).filter(ch=>ch.name&&ch.channelId);
 }catch(error){state.notice=error.message||"Channel search unavailable"}
 finally{state.loading=false;render()}
}
async function fetchDiscovery(){
 if(!state.api){toast("Video discovery needs the YouTube API connection");return}
 if(state.loadingDiscovery)return;
 state.discoveryBatch=(state.discoveryBatch+1)%9;
 const aliases={internet:"culture",weird:"comedy",autos:"technology",pets:"animals"};
 await populateHome({batch:state.discoveryBatch,lanes:["adjacent","general","obscure"],topicOverride:aliases[state.topic]||state.topic||""});
}
// A short-lived local cache keeps the iPhone PWA responsive; Cloudflare also caches
// public source cohorts between visitors. No API keys are exposed to the browser.
function saveDiscoveryPool(){
 const items=unique(state.discovered.filter(v=>v.year&&isValidId(v.id))).slice(-360);
 state.discovered=items;
 store("discoveryCacheV2",{items,year:state.settings.year,expires:Date.now()+24*3600*1000});
 const knownItems=Object.values(state.known).filter(v=>v&&isValidId(v.id));
 if(knownItems.length>520){
  const active=new Set([...state.saved,...state.history.map(x=>x.id),...items.map(x=>x.id)]);
  const kept=knownItems.filter(v=>active.has(v.id)||seedVideos.some(s=>s.id===v.id));
  state.known=Object.fromEntries([...kept.slice(-460)].map(v=>[v.id,v]));
 }
 store("known",state.known);
}
async function populateHome({batch=0,lanes=LANES,topicOverride=""}={}){
 if(!state.api||state.loadingDiscovery)return;
 const day=new Date().toISOString().slice(0,10);
 const budget=load("discoveryBudget",{day,requests:0});
 const used=budget.day===day?Number(budget.requests)||0:0;
 const selectedLanes=lanes.slice(0,Math.max(0,12-used));
 if(!selectedLanes.length){
  state.discoveryError="Daily discovery request limit reached.";
  if(state.page==="home")toast("More video searches available tomorrow");
  return;
 }
 store("discoveryBudget",{day,requests:used+selectedLanes.length});
 state.loadingDiscovery=true;state.discoveryError="";render();
 try{
  const topicPlan=selectSourceTopics({history:state.history,known:state.known,batch,rotation:state.shuffle});
  const requests=selectedLanes.map(async lane=>{
   const url=new URL("../api/discover",location.href);
   url.searchParams.set("lane",lane);
   url.searchParams.set("topic",topicOverride||topicPlan[lane]);
   url.searchParams.set("year",String(state.settings.time?state.settings.year:new Date().getUTCFullYear()));
   url.searchParams.set("batch",String(batch));
   const response=await fetch(url.toString());
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Video discovery is unavailable");
   return (data.items||[]).map(normalizeSearchItem).filter(Boolean).map(v=>({
    ...v,topic:data.sourceTopic||topicPlan[lane],sourceLane:lane,verifiedPublishedAt:true
   })).filter(yearOk);
  });
  const results=await Promise.allSettled(requests);
  const added=results.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);
  const errors=results.filter(x=>x.status==="rejected");
  if(added.length){
   const ids=new Set(state.discovered.map(v=>v.id));
   for(const v of added)if(!ids.has(v.id)){state.discovered.push(v);ids.add(v.id)}
   for(const v of added)state.known[v.id]=v;
   saveDiscoveryPool();
  }
  if(!added.length&&errors.length)state.discoveryError=String(errors[0].reason?.message||"Discovery unavailable");
 }catch(e){state.discoveryError=e.message||"Discovery unavailable"}
 finally{state.loadingDiscovery=false;render()}
}
async function fetchComments({reset=false}={}){
 if(state.commentsLoading||!state.current||!state.api)return;
 const videoId=state.current.id,all=state.commentsAll;
 if(reset){state.comments=[];state.commentsPageToken=null;state.commentsScanned=0;state.commentsLoaded=false;}
 state.commentsLoading=true;state.commentsError="";render();
 try{
  const url=new URL("../api/youtube",location.href);
  url.searchParams.set("mode","comments");url.searchParams.set("id",videoId);
  url.searchParams.set("year",String(state.settings.year));
  if(all)url.searchParams.set("all","1");
  if(state.commentsPageToken)url.searchParams.set("pageToken",state.commentsPageToken);
  const response=await fetch(url);
  const data=await response.json();if(!response.ok)throw Error(data.error||"Comments unavailable");
  if(state.current?.id!==videoId||state.commentsAll!==all)return;
  const previous=new Set(state.comments.map(c=>c.id));
  const added=(data.items||[]).filter(c=>c.id&&!previous.has(c.id));
  state.comments.push(...added);
  state.commentsPageToken=data.nextPageToken||null;
  state.commentsScanned+=Number(data.scanned)||0;
  state.commentsLoaded=true;
 }catch(error){state.commentsError=error.message||"Could not load comments";}
 finally{state.commentsLoading=false;render()}
}
async function fetchReplies(parent){
 if(!parent||!state.current||!state.api)return;
 const videoId=state.current.id;
 try{
  const url=new URL("../api/youtube",location.href);
  url.searchParams.set("mode","replies");url.searchParams.set("parent",parent);
  url.searchParams.set("year",String(state.commentsAll?new Date().getUTCFullYear():state.settings.year));
  const response=await fetch(url);const data=await response.json();
  if(!response.ok)throw Error(data.error||"Replies unavailable");
  if(state.current?.id!==videoId)return;
  state.comments=state.comments.map(c=>c.id===parent?{...c,replies:data.items||[],replyCount:(data.items||[]).length}:c);
  render();
 }catch(error){toast(error.message||"Replies unavailable")}
}
async function checkAPI(){
 try{const r=await fetch("../api/youtube?mode=status",{cache:"no-store"});if(r.ok){const j=await r.json();state.api=Boolean(j.configured)}}catch{}
 render();
 if(state.api&&state.page==="home"&&state.discovered.length<8)populateHome({batch:0});
 if(state.api&&state.page==="watch"&&state.current){
  const v=state.current;
  if(!v.channelId||!v.description||v.views==null)hydrate(v.id);
  else hydrateChannel(v.channelId);
  if(window.innerWidth>640&&!state.commentsLoaded)fetchComments({reset:true});
 }
}
async function searchSubmit(value){
 const term=value.trim();if(!term)return;
 const id=videoFromUrl(term)||(isValidId(term)?term:null);
 if(id){watch(id);return}
 state.results=[];state.searchChannels=[];state.channelsQuery="";
 state.searchTab="videos";state.searchSort="relevance";state.query=term;navigate("search",term);if(state.api)await fetchSearch(term);
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
 const el=e.target.closest("button[data-action],button[data-page],button[data-watch],button[data-save],button[data-subscribe],button[data-channel],button[data-tab],button[data-topic],button[data-search-tab],button[data-sort],button[data-react],button[data-replies],button[data-channel-tab]");
 if(!el){if(state.accountOpen&&!e.target.closest("#account-menu")){state.accountOpen=false;header()}return}
 if(el.dataset.watch){watch(el.dataset.watch);return}
 if(el.dataset.save){save(el.dataset.save);return}
 if(el.dataset.replies){await fetchReplies(el.dataset.replies);return}
 if(el.dataset.react&&state.current){
  const id=state.current.id;
  state.reactions[id]=state.reactions[id]===el.dataset.react?"":el.dataset.react;
  store("reactions",state.reactions);render();return;
 }
 if(el.dataset.subscribe){subscribe(el.dataset.subscribe);return}
 if(el.dataset.channel){
  state.selection=el.dataset.channel;state.channelTab="videos";navigate("channel");
  const candidate=channelVideos(state.selection).find(v=>v.channelId);
  if(candidate&&state.api)hydrateChannel(candidate.channelId);
  return
 }
 if(el.dataset.channelTab){state.channelTab=el.dataset.channelTab;render();return}
 if(el.dataset.page){navigate(el.dataset.page);return}
 if(el.dataset.tab){
  state.watchTab=el.dataset.tab;render();
  if(el.dataset.tab==="comments"&&!state.commentsLoaded&&state.api)fetchComments({reset:true});
  return
 }
 if(el.dataset.searchTab){state.searchTab=el.dataset.searchTab;state.filterOpen=false;render();
  if(state.searchTab==="channels"&&state.api&&state.channelsQuery!==state.query)fetchChannelSearch(state.query);
  return;
 }
 if(el.dataset.sort){state.searchSort=el.dataset.sort;state.filterOpen=false;render();return;}
 if(el.hasAttribute("data-topic")){state.topic=el.dataset.topic;navigate("discover");return}
 switch(el.dataset.action){
  case "back":if(state.page==="search"||state.page==="watch"||state.page==="settings")navigate("home");else navigate("home");return;
  case "search-gear":state.filterOpen=!state.filterOpen;render();return;
  case "toggle-guide":state.guideOpen=!state.guideOpen;state.accountOpen=false;render();return;
  case "account":state.accountOpen=!state.accountOpen;state.guideOpen=false;render();return;
  case "mobile-search":state.searchOpen=!state.searchOpen;render();if(state.searchOpen)$("#search-input").focus();return;
  case "refresh":
   state.impressions=recordImpressions(state.lastRecommendationIds.map(id=>({id})),state.impressions);
   store("impressions",state.impressions);
   state.shuffle++;render();
   if(state.api&&!state.loadingDiscovery){
    state.discoveryBatch=(state.discoveryBatch+1)%9;
    await populateHome({batch:state.discoveryBatch,lanes:["general","obscure"]});
   }
   return;
  case "load-more":
   state.feedSize=Math.min(108,state.feedSize+24);
   state.impressions=recordImpressions(state.lastRecommendationIds.map(id=>({id})),state.impressions);
   store("impressions",state.impressions);
   render();
   if(state.api&&state.discovered.length<state.feedSize+16&&!state.loadingDiscovery){
    state.discoveryBatch=(state.discoveryBatch+1)%9;
    await populateHome({batch:state.discoveryBatch,lanes:["familiar","general","obscure"]});
   }
   return;
  case "more-videos":await fetchDiscovery();return;
  case "clear-history":state.history=[];store("history",[]);render();return;
  case "expand-description":state.descriptionExpanded=!state.descriptionExpanded;render();return;
  case "load-comments":await fetchComments({reset:true});return;
  case "load-more-comments":await fetchComments();return;
  case "comments-all":state.commentsAll=true;await fetchComments({reset:true});return;
  case "comments-historical":state.commentsAll=false;await fetchComments({reset:true});return;
  case "show-filters":toast("Results are sorted by relevance and filtered by your selected year.");return;
  case "share-video":case "copy-link":
   try{
    if(el.dataset.action==="share-video"&&navigator.share)await navigator.share({title:state.current?.title||"YouTube",url:location.href});
    else {await navigator.clipboard.writeText(location.href);toast("Link copied")}
   }catch{toast("Sharing cancelled")}
   return;
 }
});
$("#guide-backdrop").addEventListener("click",()=>{collapseMenus();render()});
$("#search-form").addEventListener("submit",e=>{e.preventDefault();searchSubmit($("#search-input").value)});
document.addEventListener("change",e=>{
 const el=e.target;
 if(el.id==="username-input"){const name=el.value.trim();if(name){state.username=name;store("username",name)}}
 else if(el.id==="year-select"){
  state.settings.year=Number(el.value);state.results=state.results.filter(yearOk);
  state.discovered=[];state.feedSize=36;state.discoveryBatch=0;
  store("discoveryCacheV2",{items:[],year:state.settings.year,expires:0});
  if(state.api)Promise.resolve().then(()=>populateHome({batch:0}));
 }
 else if(el.id==="mode-select")state.settings.discovery=el.value;
 else if(el.dataset.setting){
  state.settings[el.dataset.setting]=el.checked;
  if(el.dataset.setting==="time"){
   state.discovered=[];state.feedSize=36;
   store("discoveryCacheV2",{items:[],year:state.settings.year,expires:0});
   if(state.api)Promise.resolve().then(()=>populateHome({batch:0}));
  }
 }
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
