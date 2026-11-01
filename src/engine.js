import {artistCatalog} from "./catalog.js";

export const clean=(v)=>String(v??"").trim();
export const normalize=(v)=>clean(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
let matcher=[];
export function configureExtraArtists(names=[]){
 const extras=[...new Set((Array.isArray(names)?names:[]).filter(x=>typeof x==="string").map(x=>x.trim()).filter(x=>x.length>=3&&x.length<=100))].slice(0,500).map(name=>({name,aliases:[]}));
 const registry=new Map();
 for(const artist of [...artistCatalog,...extras]){
  const k=normalize(artist.name);
  if(!registry.has(k))registry.set(k,{name:artist.name,aliases:new Set()});
  for(const alias of artist.aliases||[])registry.get(k).aliases.add(alias);
 }
 matcher=[...registry.values()].flatMap(a=>[a.name,...a.aliases].map(alias=>({a,alias:normalize(alias)})).filter(x=>x.alias.length>=3)).sort((a,b)=>b.alias.length-a.alias.length);
 return registry.size;
}
configureExtraArtists();
export function findArtists(text) {
  const s=" "+normalize(text)+" ";
  const found=new Map();
  for(const {a,alias} of matcher){if(s.includes(" "+alias+" "))found.set(normalize(a.name),a.name)}
  return [...found.values()];
}
const key=a=>normalize(a);
const tokens=text=>{
  const results=[];
  for(const match of String(text||"").matchAll(/(-?)"([^"]+)"|(-?)([^\s]+)/g)){
    const negate=(match[1]||match[3])==="-";
    const value=normalize(match[2]||match[4]||"");
    if(value.length>=2)results.push({value,negate});
  }
  return results;
};
export function searchThreads(threads,{q="",source="all",year="all",tag="all",sort="relevance"}={}) {
  const query=tokens(q);
  const results=[];
  for(const t of threads){
    if(source!=="all"&&t.source!==source)continue;
    if(year!=="all"&&String(t.year)!==String(year))continue;
    if(tag!=="all"&&!(t.tags||[]).includes(tag))continue;
    const title=normalize(t.title),body=normalize((t.posts||[]).map(p=>p.text).join(" ")),tags=normalize((t.tags||[]).join(" ")),author=normalize((t.posts||[]).map(p=>p.author).join(" "));
    const artists=normalize(threadArtists(t).join(" "));
    let score=0,matched=true;
    for(const {value:w,negate} of query){
      let termScore=0;
      if(title.includes(w))termScore+=9;
      if(tags.includes(w))termScore+=7;
      if(artists.includes(w))termScore+=8;
      if(author.includes(w))termScore+=4;
      if(body.includes(w))termScore+=Math.min(5,1+body.split(w).length-2);
      if(negate&&termScore){matched=false;break}
      if(!negate&&!termScore){matched=false;break}
      if(!negate)score+=termScore;
    }
    if(matched)results.push({...t,score});
  }
  if(sort==="oldest")results.sort((a,b)=>a.date.localeCompare(b.date));
  else if(sort==="newest")results.sort((a,b)=>b.date.localeCompare(a.date));
  else results.sort((a,b)=>b.score-a.score||b.date.localeCompare(a.date));
  return results;
}
export function bestSnippet(thread,q,max=215){
 const positive=tokens(q).filter(t=>!t.negate).map(t=>t.value);
 const posts=thread.posts||[];
 let best=posts[0]||{text:"",author:""};
 if(positive.length){
  let bestScore=-1;
  for(const post of posts){
   const n=normalize(post.text||"");
   const score=positive.reduce((sum,t)=>sum+(n.includes(t)?t.length+3:0),0);
   if(score>bestScore){bestScore=score;best=post}
  }
 }
 const body=String(best.text||"");
 if(body.length<=max)return {text:body,author:best.author||"Unknown"};
 const lower=body.toLowerCase();
 let at=-1;
 for(const token of positive){const idx=lower.indexOf(token);if(idx>=0&&(at<0||idx<at))at=idx}
 const start=Math.max(0,at>=0?at-60:0);
 const end=Math.min(body.length,start+max);
 return {text:(start?"…":"")+body.slice(start,end).trim()+(end<body.length?"…":""),author:best.author||"Unknown"};
}
export const threadArtists=t=>[...new Set((t.posts||[]).flatMap(p=>findArtists(p.text||"")))];
function explicitRecommendations(p){
  if(Array.isArray(p.recommended))return p.recommended;
  const text=clean(p.text||"");
  // A single post may discuss bands without recommending all of them.
  return [...new Set(text.split(/[.!?\n]+/).filter(sentence=>/\b(recommends?|recommended|suggests?|suggested|check out|try listening|you might like)\b/i.test(sentence)&&!/\b(?:don't|do not|does not|never|not)\s+(?:recommend|suggest)\b/i.test(sentence)).flatMap(findArtists))];
}
function userChoices(p){
  const mentions=findArtists(p.text||"");
  const excluded=new Set((p.excluded||[]).map(key));
  // Exclude explicitly negated recommendations conservatively.
  const stripped=clean(p.text).replace(/\b(?:don't|do not|does not|never|not)\s+(?:suggest|recommend|want)\b[^.!?\n]*/gi,"");
  const positive=new Set(findArtists(stripped).map(key));
  return mentions.filter(a=>positive.has(key(a))&&!excluded.has(key(a)));
}
function artistLikes(p){
  if(Array.isArray(p.likedArtists))return [...new Set(p.likedArtists.filter(Boolean))];
  // Posting about a group, arguing about a group, and liking it are distinct.
  // Don't manufacture preferences from ambiguous old discussions.
  if(p.kind==="favorites")return userChoices(p);
  return [];
}
export function buildGraph(threads) {
  const edges=new Map(),mentionCounts=new Map(),authors=new Map();
  const add=(a,b,weight,evidence,kind)=>{
    if(key(a)===key(b))return;
    const edgeKey=[key(a),key(b)].sort().join("::");
    const entry=edges.get(edgeKey)||{artists:[a,b],weight:0,recommendationCount:0,evidence:[]};
    entry.weight+=weight;if(kind==="recommended")entry.recommendationCount++;
    if(entry.evidence.length<20)entry.evidence.push({...evidence,kind,weight});
    edges.set(edgeKey,entry);
  };
  for(const thread of threads){
    const byPost=(thread.posts||[]).map(p=>({...p,artists:userChoices(p),likes:artistLikes(p)}));
    const requested=[...new Set(byPost.filter(p=>p.kind==="request").flatMap(p=>p.artists))];
    for(const p of byPost){
      for(const a of p.artists)mentionCounts.set(key(a),(mentionCounts.get(key(a))||0)+1);
      const authorKey=thread.source+"::"+(p.author||"unknown").toLowerCase();
      const profile=authors.get(authorKey)||{id:authorKey,name:p.author||"unknown",source:thread.source,artists:new Map(),threads:new Set()};
      for(const a of p.likes)profile.artists.set(a,(profile.artists.get(a)||0)+1);
      profile.threads.add(thread.id);
      authors.set(authorKey,profile);
      const evidence={threadId:thread.id,thread:thread.title,source:thread.source,url:thread.sourceUrl,postId:p.id,author:p.author,date:p.date,origin:thread.origin};
      // Large discography/list posts are much weaker similarity evidence.
      const n=p.artists.length;
      const weight=n>8?.035:n>4?.12:.3;
      if(n<=22)for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)add(p.artists[i],p.artists[j],weight,evidence,"co-mentioned");
      if(p.kind==="recommendation"&&requested.length){
        for(const recommendation of explicitRecommendations(p))for(const prompt of requested)add(prompt,recommendation,4,evidence,"recommended");
      }
    }
  }
  return {edges:[...edges.values()],mentionCounts,authors:[...authors.values()].map(a=>({...a,artists:[...a.artists].sort((x,y)=>y[1]-x[1]),threads:[...a.threads]}))};
}
export function discover(threads,liked=[],limit=30) {
  const graph=buildGraph(threads),favs=new Set(liked.map(key)),found=new Map();
  for(const edge of graph.edges)for(const a of edge.artists){
    const from=edge.artists.find(x=>key(x)!==key(a));
    if(!favs.has(key(from))||favs.has(key(a)))continue;
    const k=key(a);
    const row=found.get(k)||{name:a,score:0,evidence:[],matchedWith:[]};
    row.score+=edge.weight;
    row.matchedWith.push(from);
    row.evidence.push(...edge.evidence);
    found.set(k,row);
  }
  return [...found.values()].map(r=>({...r,explicitCount:r.evidence.filter(x=>x.kind==="recommended").length,matchedWith:[...new Set(r.matchedWith)],evidence:r.evidence.filter((v,i,a)=>a.findIndex(x=>x.threadId===v.threadId&&x.postId===v.postId&&x.kind===v.kind)===i)})).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function similarAuthors(threads,liked=[],limit=20) {
  const wanted=new Set(liked.map(key));
  const graph=buildGraph(threads);
  return graph.authors.map(a=>{
    const artists=a.artists.map(([n])=>n),overlap=artists.filter(n=>wanted.has(key(n)));
    return {...a,overlap,matchCount:overlap.length,similarity:wanted.size?overlap.length/Math.sqrt(wanted.size*Math.max(1,artists.length)):0};
  }).filter(x=>x.matchCount).sort((a,b)=>b.similarity-a.similarity||b.matchCount-a.matchCount).slice(0,limit);
}
export function stats(threads){
  return {threads:threads.length,posts:threads.reduce((s,t)=>s+(t.posts?.length||0),0),artists:new Set(threads.flatMap(threadArtists)).size,sources:new Set(threads.map(t=>t.source)).size};
}
