// Discover threads from a fetched forum index. No fabricated results or automatic crawl.
// The caller supplies HTML from an explicitly requested, approved source URL.
const ignore=/^(?:last page|first page|go to|page \d+|next|previous|latest|thread tools|watch thread|reply)$/i;
export function canonicalThreadURL(raw,base){
 try{
  const href=new URL(raw,base);
  if(!["http:","https:"].includes(href.protocol)||href.username||href.password)return null;
  const archive=href.hostname==="web.archive.org";
  let origin=href;
  if(archive){
   const match=href.pathname.match(/^\/web\/\d{6,14}(?:id_)?\/(https?:\/\/.+)$/i);
   if(!match)return null;
   origin=new URL(match[1]+href.search);
  }
  if(!/^(?:www\.)?lpassociation\.com$|^(?:forum\.)?chorus\.fm$|^www\.chorus\.fm$/i.test(origin.hostname))return null;
  const match=origin.pathname.match(/\/(?:forum\/)?threads\/([a-z0-9-]+)\.(\d+)(?:\/|$)/i);
  if(!match)return null;
  return "https://"+origin.hostname.toLowerCase()+"/"+(origin.pathname.includes("/forum/")?"forum/":"")+"threads/"+match[1].toLowerCase()+"."+match[2]+"/";
 }catch{return null}
}
export function discoverThreadLinks(html,base,{keywords="",limit=250}={}){
 const doc=new DOMParser().parseFromString(html,"text/html");
 const q=keywords.toLowerCase().trim().split(/[,\s]+/).filter(Boolean);
 const results=new Map();
 for(const a of doc.querySelectorAll("a[href]")){
  const href=canonicalThreadURL(a.getAttribute("href"),base);
  if(!href)continue;
  const title=(a.textContent||"").replace(/\s+/g," ").trim().slice(0,180);
  if(title.length<5||ignore.test(title)||/^\d+$/.test(title))continue;
  const container=a.closest(".discussionListItem, .structItem, .discussionList, li, .threadbit, tr")||a;
  const local=(container.textContent||"").replace(/\s+/g," ").trim().slice(0,600);
  const score=q.length?q.reduce((n,k)=>n+(title.toLowerCase().includes(k)?7:local.toLowerCase().includes(k)?2:0),0):0;
  const existing=results.get(href);
  const candidate={url:href,title,score,context:local.slice(0,180)};
  if(!existing||candidate.title.length>existing.title.length||score>existing.score)results.set(href,candidate);
  if(results.size>=Math.min(500,limit*2))break;
 }
 return [...results.values()].sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,limit);
}
export const defaultKeywords="emo screamo post-hardcore pop punk scene myspace saosin chiodos aiden";
export function normalizeURLForDedupe(raw){
 const c=canonicalThreadURL(raw,raw);if(c)return c;
 try{const u=new URL(raw);return u.origin+u.pathname.replace(/\/+$/,"")+"/"}catch{return String(raw||"")}
}
