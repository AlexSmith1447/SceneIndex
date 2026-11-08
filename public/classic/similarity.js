/**
 * Classic YouTube content recommender: lightweight JavaScript adaptation
 * of the TF-IDF cosine SimilarityRecommender approach in WatchLens.
 * Source: https://github.com/WatchLens/WatchLens/blob/main/backend/app/recommenders/similarity.py
 * WatchLens © 2026 Deogyong Kim and Dongha Lee; MIT License.
 *
 * This JS implementation is independently written to run without Python,
 * scikit-learn, a remote ML server or training on other people's histories.
 * It uses textual features only (title/description/tags). It does not recreate
 * YouTube's private recommendation graph or any archived 2013 view metrics.
 */
const STOP=new Set("a an the and or for to from of on at in it this that with how are what why is was were be you your my his her its i we they he she our new official video videos watch full part episode channel youtube 2010 2011 2012 2013 2008 2009 2014 hd 1080p 720p live original ft".split(" "));
const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[\u0300-\u036f]/g,"");
const tokenize=s=>(norm(s).match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(w=>!STOP.has(w)).slice(0,220);
const textFor=v=>[
 Array(3).fill(String(v.title||"")).join(" "),
 Array.isArray(v.tags)?Array(2).fill(v.tags.join(" ")).join(" "):"",
 String(v.description||"").slice(0,650)
].join(" ");
export function buildIndex(videos=[]){
 const pool=videos.filter(v=>v?.id&&v?.title).slice(0,520);
 const docs=pool.map(v=>tokenize(textFor(v)));
 const df=new Map();
 for(const words of docs)for(const token of new Set(words))df.set(token,(df.get(token)||0)+1);
 const size=docs.length;
 const vecs=docs.map(words=>{
  const counts=new Map();for(const w of words)counts.set(w,(counts.get(w)||0)+1);
  const w=new Map();let magnitude=0;
  for(const [term,count] of counts){
   const weight=(1+Math.log(count))*(Math.log((size+1)/((df.get(term)||0)+1))+1);
   w.set(term,weight);magnitude+=weight*weight;
  }
  const length=Math.sqrt(magnitude)||1;for(const [term,value] of w)w.set(term,value/length);
  return w;
 });
 return {pool,vecs,idToIndex:new Map(pool.map((v,i)=>[v.id,i]))};
}
export function cosine(a,b){
 if(!a?.size||!b?.size)return 0;
 const [small,big]=a.size<b.size?[a,b]:[b,a];let total=0;
 for(const [k,v] of small)total+=v*(big.get(k)||0);
 return total;
}
export function recommendRelated(current,allVideos,options={}){
 if(!current)return [];
 const pool=[current,...(allVideos||[]).filter(v=>v?.id&&v.id!==current.id)];
 const idx=buildIndex(pool);
 const first=idx.vecs[0];
 const watched=new Set((options.history||[]).map(x=>x.id));
 const includeYear=options.year||2013;
 const list=idx.pool.slice(1).map((v,i)=>({
  v,similarity:cosine(first,idx.vecs[i+1]),
  seen:watched.has(v.id),random:(hash(v.id+":"+current.id)%1000)/1000
 })).filter(x=>(!options.time||Number(x.v.year)<=includeYear)&&Number(x.v.year)>0);
 list.sort((a,b)=>(b.similarity*5-(b.seen?.9:0)+b.random*.15)-(a.similarity*5-(a.seen?.9:0)+a.random*.15));
 // Prevent a single creator filling the related rail.
 const channel=new Map(),result=[];
 for(const x of list){
  const id=x.v.channelId||x.v.channel;
  if((channel.get(id)||0)>=3)continue;
  channel.set(id,(channel.get(id)||0)+1);result.push(x.v);
  if(result.length>=(options.limit||16))break;
 }
 return result;
}
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function profileAffinity(pool=[],history=[],known={},reactions={}){
 if(!pool.length||!history.length)return new Map();
 const watched=history.slice(0,16).map(x=>known[x.id]).filter(Boolean);
 if(!watched.length)return new Map();
 const seen=new Set(pool.map(x=>x.id));
 const corpus=[...pool,...watched.filter(x=>!seen.has(x.id))];
 const index=buildIndex(corpus);
 const profile=new Map();
 let n=0;
 for(const [i,v] of index.pool.entries()){
  if(!watched.some(x=>x.id===v.id))continue;
  const signal=reactions[v.id]==="dislike"?-1:reactions[v.id]==="like"?1.4:1;
  for(const [term,value] of index.vecs[i])profile.set(term,(profile.get(term)||0)+value*signal);
  n++;
 }
 if(!n)return new Map();
 let mag=0;for(const val of profile.values())mag+=val*val;
 mag=Math.sqrt(mag)||1;for(const [term,val] of profile)profile.set(term,val/mag);
 return new Map(index.pool.map((v,i)=>[v.id,cosine(profile,index.vecs[i])]));
}
