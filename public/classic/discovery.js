// Browser-side candidate selection for a historical YouTube feed.
// Inputs are public metadata provided by YouTube. This is our original heuristic,
// not a reconstruction of YouTube's private 2013 ranking algorithm.
export const LANES=["familiar","adjacent","general","obscure"];
export const LANE_SPLIT={familiar:0.40,adjacent:0.25,general:0.25,obscure:0.10};
export const DISCOVERY_TOPICS=[
 "gaming","animation","music","comedy","science","technology","education",
 "sports","animals","travel","vlogs","arts","howto","film","culture"
];
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function hashValue(value){
 let h=2166136261>>>0;
 for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
 return h>>>0;
}
export function normalizeHistory(history=[],known={}){
 const topicCounts=new Map();
 const channelCounts=new Map();
 for(const entry of (Array.isArray(history)?history:[]).slice(0,100)){
  const v=known?.[entry.id];if(!v)continue;
  if(v.topic)topicCounts.set(v.topic,(topicCounts.get(v.topic)||0)+1);
  if(v.channelId||v.channel){
   const key=v.channelId||v.channel;
   channelCounts.set(key,(channelCounts.get(key)||0)+1);
  }
 }
 return {topicCounts,channelCounts};
}
export function chooseInterest(history=[],known={},subscribed=[]){
 const {topicCounts}=normalizeHistory(history,known);
 let best="",count=0;
 for(const [topic,n] of topicCounts){
  if(DISCOVERY_TOPICS.includes(topic)&&n>count){best=topic;count=n}
 }
 if(best)return best;
 // A blank account should not be treated as a Minecraft/nostalgia fan.
 return "";
}
export function chooseAdjacent(topic,batch=0){
 const graph={
  gaming:["technology","animation","comedy","arts"],
  animation:["film","comedy","arts","gaming"],
  music:["arts","culture","film","vlogs"],
  comedy:["animation","film","vlogs","culture"],
  science:["technology","education","animals","film"],
  technology:["science","gaming","howto","education"],
  education:["science","howto","culture","technology"],
  sports:["travel","vlogs","howto","culture"],
  animals:["science","travel","comedy","vlogs"],
  travel:["culture","animals","vlogs","film"],
  vlogs:["culture","comedy","travel","music"],
  arts:["film","animation","music","howto"],
  howto:["education","arts","technology","animals"],
  film:["animation","arts","comedy","music"],
  culture:["travel","music","vlogs","education"]
 };
 const options=graph[topic]||DISCOVERY_TOPICS;
 return options[Math.abs(Number(batch)||0)%options.length];
}
function videoScore(v,opts={}){
 const history=opts.history||[],saved=opts.saved||[],likes=opts.likes||{},impressions=opts.impressions||{},subscriptions=opts.subscriptions||[];
 const known=opts.known||{};
 const lane=v.sourceLane||v.lane||"general";
 const hash=hashValue([v.id,opts.rotation||0,opts.year||2013].join(":"))/4294967295;
 const seenIndex=history.findIndex(x=>x?.id===v.id);
 const channel=String(v.channelId||v.channel||"");
 const {_channel,topicCounts,channelCounts}=opts._signals||normalizeHistory(history,known);
 const topicFamiliarity=clamp((topicCounts.get(v.topic)||0)/8,0,1);
 const followed=subscriptions.includes(v.channel)?1:0;
 const liked=likes[v.id]==="like"?1:0,disliked=likes[v.id]==="dislike"?1:0;
 const viewed=seenIndex>=0?1:0;
 const exposures=Math.min(4,Number(impressions[v.id])||0);
 const channelExposure=clamp((channelCounts.get(channel)||0)/5,0,1);
 const affinity=Math.max(0,Math.min(1,Number(opts.affinity?.get?.(v.id)||0)));
 let score=hash*1.3+affinity*6+followed*.7+liked*.8-disliked*4-viewed*2.2-exposures*.5;
 if(lane==="familiar")score+=topicFamiliarity*1.5+channelExposure*.3;
 if(lane==="adjacent")score+=Math.min(1,topicFamiliarity)*.25;
 if(lane==="obscure"){
  // CURRENT public views are used only as a relative discovery heuristic.
  // They do not represent how many views a video had in 2013.
  const views=Number(v.views);
  if(Number.isFinite(views)&&views>=0)score+=views<10000?2.0:views<100000?1.2:views<1000000?.4:-.3;
 }
 return score;
}
export function rankFeed(videos=[],options={}){
 const seenIds=new Set(),byLane={familiar:[],adjacent:[],general:[],obscure:[]},unclassified=[];
 const year=Number(options.year)||2013,cap=clamp(Number(options.limit)||48,1,120);
 for(const v of videos){
  if(!v||!v.id||seenIds.has(v.id))continue;
  const yr=Number(v.year);
  if(!yr||(options.time!==false&&yr>year))continue;
  if(options.hiddenIds?.includes?.(v.id))continue;
  seenIds.add(v.id);
  const lane=v.sourceLane||v.lane||"general";
  (byLane[lane]||unclassified).push(v);
 }
 const signals=normalizeHistory(options.history,options.known);
 const rankOpts={...options,_signals:signals};
 for(const bucket of [...Object.values(byLane),unclassified])bucket.sort((a,b)=>videoScore(b,rankOpts)-videoScore(a,rankOpts));
 const ordered=[],countByChannel=new Map();
 const canAdd=v=>{
  const key=v.channelId||v.channel||"unknown";
  return (countByChannel.get(key)||0)<(ordered.length<24?2:3);
 };
 const add=v=>{
  ordered.push(v);const key=v.channelId||v.channel||"unknown";countByChannel.set(key,(countByChannel.get(key)||0)+1);
 };
 // Rotate picks rather than concatenate lanes: the feed doesn't look artificially sectioned.
 const goals={};
 for(const lane of LANES)goals[lane]=Math.round(cap*LANE_SPLIT[lane]);
 const placed={familiar:0,adjacent:0,general:0,obscure:0};
 for(let i=0;i<cap;i++){
  let chosen=null,bucketName="";
  const active=LANES.filter(l=>byLane[l].some(canAdd)&&placed[l]<goals[l]);
  const available=active.length?active:LANES.filter(l=>byLane[l].some(canAdd));
  // Balance how full each lane is compared with its target.
  available.sort((a,b)=>(placed[a]/Math.max(1,goals[a]))-(placed[b]/Math.max(1,goals[b])));
  for(const lane of available){
   const index=byLane[lane].findIndex(canAdd);
   if(index>=0){chosen=byLane[lane].splice(index,1)[0];bucketName=lane;break}
  }
  if(!chosen){
   const extras=[...unclassified,...LANES.flatMap(l=>byLane[l])].sort((a,b)=>videoScore(b,rankOpts)-videoScore(a,rankOpts));
   chosen=extras.find(canAdd)||extras[0];bucketName=chosen?.sourceLane||"general";
   if(chosen){if(byLane[bucketName])byLane[bucketName]=byLane[bucketName].filter(v=>v.id!==chosen.id);else unclassified.splice(unclassified.findIndex(x=>x.id===chosen.id),1)}
  }
  if(!chosen)break;
  add(chosen);
  if(placed[bucketName]!==undefined)placed[bucketName]++;
 }
 return ordered;
}
export function recordImpressions(videos,previous={}){
 const next={...previous};
 for(const v of videos||[])if(v.id)next[v.id]=clamp(Number(next[v.id]||0)+1,0,100);
 return Object.fromEntries(Object.entries(next).sort((a,b)=>b[1]-a[1]).slice(0,500));
}
export function selectSourceTopics({history=[],known={},batch=0,rotation=0}={}){
 const interest=chooseInterest(history,known);
 const general=DISCOVERY_TOPICS[hashValue("general:"+batch+":"+rotation)%DISCOVERY_TOPICS.length];
 const other=DISCOVERY_TOPICS[hashValue("obscure:"+batch+":"+rotation)%DISCOVERY_TOPICS.length];
 return {
  familiar:interest||DISCOVERY_TOPICS[hashValue("familiar:"+batch+":"+rotation)%DISCOVERY_TOPICS.length],
  adjacent:interest?chooseAdjacent(interest,batch+rotation):DISCOVERY_TOPICS[hashValue("adjacent:"+batch+":"+rotation)%DISCOVERY_TOPICS.length],
  general,
  obscure:other
 };
}