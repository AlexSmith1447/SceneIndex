import assert from "node:assert/strict";
import {buildIndex,cosine,recommendRelated,profileAffinity} from "../public/classic/similarity.js";
import {onRequestGet as youtubeHandler} from "../functions/api/youtube.js";
import {onRequestGet as ratingsHandler} from "../functions/api/ratings.js";

const source={id:"MINECRAFT01",title:"Minecraft survival redstone tutorial",channel:"Old Gamer",year:2012,description:"How to build redstone pistons in Minecraft"};
const similar={id:"MINECRAFT02",title:"Minecraft piston redstone survival guide",channel:"Tech Gamer",year:2011,description:"Redstone circuits and piston farm"};
const unrelated={id:"MUSICABCDE",title:"Violin orchestra recital",channel:"Strings",year:2012,description:"Classical strings music"};
const post={id:"FUTUREVIDEO",title:"Minecraft redstone piston",channel:"New Gamer",year:2019};
const list=[similar,unrelated,post];
const ranked=recommendRelated(source,list,{year:2013,time:true,limit:10,history:[]});
assert.deepEqual(ranked.map(v=>v.id),[similar.id,unrelated.id],"TF-IDF should favor relevant older videos and reject post-cutoff videos");
const index=buildIndex([source,similar,unrelated]);
assert.ok(cosine(index.vecs[0],index.vecs[1])>cosine(index.vecs[0],index.vecs[2]));
const affinity=profileAffinity([similar,unrelated],[{id:source.id}],{[source.id]:source},{});
assert.ok(affinity.get(similar.id)>affinity.get(unrelated.id));

const mk=(id,date,avatar,author)=>{
 const snippet={publishedAt:date,authorDisplayName:author,textDisplay:"A comment from "+author,likeCount:4,authorProfileImageUrl:avatar};
 return {snippet:{topLevelComment:{id,snippet},totalReplyCount:0},replies:{comments:[]}};
};
let requested=[];
const originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async input=>{
  const u=new URL(String(input));requested.push(u.pathname);
  if(u.pathname.endsWith("/commentThreads")){
   const token=u.searchParams.get("pageToken");
   const items=token==="PAGE2"?[mk("comment_older_0002","2012-01-01T00:00:00Z","https://example.com/b.png","Old User")]:
    [mk("comment_modern_0001","2024-01-01T00:00:00Z","https://example.com/a.png","Modern User"),
     mk("comment_oldest_0001","2013-01-01T00:00:00Z","https://example.com/b.png","Historic User")];
   return new Response(JSON.stringify({items,nextPageToken:token?null:"PAGE2"}),{status:200});
  }
  if(u.hostname==="returnyoutubedislikeapi.com"){
   return new Response(JSON.stringify({likes:100,dislikes:25}),{status:200});
  }
  return new Response(JSON.stringify({items:[]}),{status:200});
 };
 const request=new Request("https://classic.example/api/youtube?mode=comments&id=AdYaTa_lOf4&year=2013");
 const response=await youtubeHandler({request,env:{YOUTUBE_API_KEY:"test-key"}});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.items.length,2,"Should scan multiple pages for older comments instead of returning one");
 assert.ok(data.items.every(c=>Number(c.date.slice(0,4))<=2013));
 assert.equal(data.items[0].author,"Historic User");
 assert.equal(data.items[0].avatar,"https://example.com/b.png");
 assert.equal(data.scanned,3);
 const modern=await youtubeHandler({request:new Request("https://classic.example/api/youtube?mode=comments&id=AdYaTa_lOf4&year=2013&all=1"),env:{YOUTUBE_API_KEY:"test-key"}});
 assert.ok((await modern.json()).items.some(c=>c.author==="Modern User"),"All mode should show surviving modern comments");
 const rating=await ratingsHandler({request:new Request("https://classic.example/api/ratings?id=AdYaTa_lOf4")});
 assert.equal(rating.status,200);
 const vote=await rating.json();
 assert.deepEqual([vote.likes,vote.dislikes],[100,25]);
 assert.equal(vote.estimated,true,"Third-party dislikes must remain marked estimated");
 console.log("Classic watch metadata, comments, avatars and TF-IDF similarity tests passed");
}finally{globalThis.fetch=originalFetch}
