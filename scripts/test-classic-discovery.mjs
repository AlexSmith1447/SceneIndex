import assert from "node:assert/strict";
import {rankFeed,selectSourceTopics,normalizeHistory,recordImpressions,LANES} from "../public/classic/discovery.js";

const pool=LANES.flatMap((lane,laneIndex)=>
 Array.from({length:45},(_,i)=>({
  id:("abc"+laneIndex+"_"+String(i).padStart(3,"0")+"xyz").slice(0,11),
  channel:"Creator_"+laneIndex+"_"+i,
  year:i===44?2014:2011,
  date:"2011-04-15",
  topic:lane==="familiar"?"gaming":"science",
  sourceLane:lane,
  views:10000+(i*1000)
 })));
const known=Object.fromEntries(pool.map(x=>[x.id,x]));
const history=[{id:pool[0].id}];
const first=rankFeed(pool,{limit:48,year:2013,time:true,known,history,rotation:0});
assert.equal(first.length,48);
assert.equal(new Set(first.map(v=>v.id)).size,48,"must deduplicate");
assert.ok(first.every(v=>v.year<=2013),"cannot show videos published after 2013");
const counts=Object.fromEntries(LANES.map(l=>[l,first.filter(v=>v.sourceLane===l).length]));
assert.deepEqual(counts,{familiar:19,adjacent:12,general:12,obscure:5},"must respect 40/25/25/10 mix when candidates exist");
assert.equal(first.slice(0,24).length,24);
const withoutTime=rankFeed(pool,{limit:180,year:2013,time:false,known,history,rotation:0});
assert.ok(withoutTime.some(v=>v.year===2014),"turning off historical restriction permits newer videos");
const signals=normalizeHistory(history,known);
assert.equal(signals.topicCounts.get("gaming"),1);
const choices=selectSourceTopics({history,known,batch:0,rotation:0});
assert.equal(choices.familiar,"gaming","learning should guide familiar-source discovery");
assert.notEqual(choices.adjacent,"gaming","adjacent mode should broaden the topic");
const coldStart=selectSourceTopics({history:[],known:{},batch:0,rotation:0});
assert.ok(coldStart.familiar,"empty history still selects a broad topic");
const exposures=recordImpressions(first.slice(0,4),{});
assert.equal(exposures[first[0].id],1);
console.log("Classic YouTube discovery tests passed",counts);
