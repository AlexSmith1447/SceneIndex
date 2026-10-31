import {artistCatalog} from "./catalog.js";

export const clean=(v)=>String(v??"").trim();
export const normalize=(v)=>clean(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const matcher=artistCatalog.flatMap(a=>[a.name,...a.aliases].filter(x=>x.length>=3).map(alias=>({a,alias:normalize(alias)}))).sort((a,b)=>b.alias.length-a.alias.length);
export function findArtists(text) {
  const s=" "+normalize(text)+" ";
  const found=new Map();
  for(const {a,alias} of matcher){if(s.includes(" "+alias+" "))found.set(normalize(a.name),a.name)}
  return [...found.values()];
}
const key=a=>normalize(a);
const words=text=>normalize(text).split(" ").filter(w=>w.length>=3);
export function searchThreads(threads,{q="",source="all",year="all",tag="all",sort="relevance"}={}) {
  const query=words(q);
  const results=[];
  for(const t of threads){
    if(source!=="all"&&t.source!==source)continue;
    if(year!=="all"&&String(t.year)!==String(year))continue;
    if(tag!=="all"&&!(t.tags||[]).includes(tag))continue;
    const title=normalize(t.title),body=normalize((t.posts||[]).map(p=>p.text).join(" ")),tags=normalize((t.tags||[]).join(" ")),author=normalize((t.posts||[]).map(p=>p.author).join(" "));
    const artists=normalize(threadArtists(t).join(" "));
    let score=0,matched=true;
    for(const w of query){
      let termScore=0;
      if(title.includes(w))termScore+=8;
      if(tags.includes(w))termScore+=6;
      if(artists.includes(w))termScore+=6;
      if(author.includes(w))termScore+=3;
      if(body.includes(w))termScore+=Math.min(4,1+body.split(w).length-2);
      if(!termScore){matched=false;break}score+=termScore;
    }
    if(matched)results.push({...t,score});
  }
  if(sort==="oldest")results.sort((a,b)=>a.date.localeCompare(b.date));
  else if(sort==="newest")results.sort((a,b)=>b.date.localeCompare(a.date));
  else results.sort((a,b)=>b.score-a.score||b.date.localeCompare(a.date));
  return results;
}
export const threadArtists=t=>[...new Set((t.posts||[]).flatMap(p=>findArtists(p.text||"")))];
function explicitRecommendations(p){
  if(Array.isArray(p.recommended))return p.recommended;
  const text=clean(p.text||"");
  // A single post may discuss bands without recommending all of them.
  return [...new Set(text.split(/[.!?\n]+/).filter(sentence=>/\b(recommend|suggest|check out|try listening|you might like)\b/i.test(sentence)&&!/\b(?:don't|do not|does not|never|not)\s+(?:recommend|suggest)\b/i.test(sentence)).flatMap(findArtists))];
}
function userChoices(p){
  const mentions=findArtists(p.text||"");
  const excluded=new Set((p.excluded||[]).map(key));
  // Exclude explicitly negated recommendations conservatively.
  const stripped=clean(p.text).replace(/\b(?:don't|do not|does not|never|not)\s+(?:suggest|recommend|want)\b[^.!?\n]*/gi,"");
  const positive=new Set(findArtists(stripped).map(key));
  return mentions.filter(a=>positive.has(key(a))&&!excluded.has(key(a)));
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
    const byPost=(thread.posts||[]).map(p=>({...p,artists:userChoices(p)}));
    const requested=[...new Set(byPost.filter(p=>p.kind==="request").flatMap(p=>p.artists))];
    for(const p of byPost){
      for(const a of p.artists)mentionCounts.set(key(a),(mentionCounts.get(key(a))||0)+1);
      const authorKey=thread.source+"::"+(p.author||"unknown").toLowerCase();
      const profile=authors.get(authorKey)||{id:authorKey,name:p.author||"unknown",source:thread.source,artists:new Map(),threads:new Set()};
      for(const a of p.artists)profile.artists.set(a,(profile.artists.get(a)||0)+1);
      profile.threads.add(thread.id);
      authors.set(authorKey,profile);
      const evidence={threadId:thread.id,thread:thread.title,source:thread.source,url:thread.sourceUrl,postId:p.id,author:p.author,date:p.date,origin:thread.origin};
      for(let i=0;i<p.artists.length;i++)for(let j=i+1;j<p.artists.length;j++)add(p.artists[i],p.artists[j],.35,evidence,"co-mentioned");
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
  return [...found.values()].map(r=>({...r,matchedWith:[...new Set(r.matchedWith)],evidence:r.evidence.filter((v,i,a)=>a.findIndex(x=>x.threadId===v.threadId&&x.postId===v.postId&&x.kind===v.kind)===i)})).sort((a,b)=>b.score-a.score).slice(0,limit);
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
