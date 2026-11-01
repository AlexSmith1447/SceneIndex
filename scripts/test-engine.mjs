import assert from "node:assert/strict";
import {starterThreads,artistCatalog} from "../src/catalog.js";
import {findArtists,threadArtists,searchThreads,bestSnippet,buildGraph,discover,similarAuthors,stats} from "../src/engine.js";
import {onRequestGet} from "../functions/api/lastfm.js";
import {onRequestGet as archiveRequest} from "../functions/api/archive.js";

const seeded=starterThreads[0];
assert.equal(seeded.posts.length,2);
assert.equal(seeded.origin,"verified-paraphrase");
assert.ok(seeded.sourceUrl.startsWith("https://"));
assert.ok(findArtists("I love Sky Eats Airplane and Breathe Carolina").includes("Sky Eats Airplane"));
assert.ok(!findArtists("notforsky eats airplane").includes("Sky Eats Airplane"));
assert.equal(searchThreads(starterThreads,{q:"The Medic Droid"}).length,1);
assert.equal(searchThreads(starterThreads,{q:'"The Medic Droid"'}).length,1);
assert.equal(searchThreads(starterThreads,{q:'"The Medic Droid" -sky'}).length,0);
assert.equal(bestSnippet(starterThreads[0],'"The Medic Droid"').author,"minusxerø");
assert.ok(bestSnippet(starterThreads[0],'"The Medic Droid"').text.includes("The Medic Droid"));
assert.equal(searchThreads(starterThreads,{q:"random nonexistent musician"}).length,0);
assert.ok(threadArtists(seeded).includes("Scary Kids Scaring Kids"));
const graph=buildGraph(starterThreads);
const preferred=discover(starterThreads,["Sky Eats Airplane"]);
const result=preferred.find(x=>x.name==="The Medic Droid");
assert.ok(result,"The Medic Droid should be recommended based on a real reply");
assert.ok(result.evidence.some(e=>e.kind==="recommended"&&e.source==="LP Association Forums"));
assert.ok(!preferred.some(x=>x.name==="BrokeNCYDE"),"Negative preference must not become a recommendation");
assert.ok(!preferred.some(x=>x.name==="Kill Hannah"),"Negative preference must not become a recommendation");
const users=similarAuthors(starterThreads,["Breathe Carolina"]);
assert.ok(users.some(x=>x.name==="Daniel"));
assert.equal(stats(starterThreads).threads,11);
assert.equal(stats(starterThreads).posts,23);
assert.ok(artistCatalog.length>25);
let r=await onRequestGet({request:new Request("https://scene.test/api/lastfm?status=1"),env:{}});
assert.equal((await r.json()).configured,false);
r=await onRequestGet({request:new Request("https://scene.test/api/lastfm?user=tester"),env:{}});
assert.equal(r.status,503);
r=await onRequestGet({request:new Request("https://scene.test/api/lastfm?user=https://evil.com"),env:{LASTFM_API_KEY:"key"}});
assert.equal(r.status,400);
const previous=globalThis.fetch;let fetchURL="";
try{
 globalThis.fetch=async url=>{fetchURL=String(url);return new Response(JSON.stringify({topartists:{artist:[{name:"The Medic Droid",playcount:"12"}]}}),{status:200,headers:{"Content-Type":"application/json"}})};
 r=await onRequestGet({request:new Request("https://scene.test/api/lastfm?user=tester&mode=top"),env:{LASTFM_API_KEY:"key"}});
 assert.equal(r.status,200);const result=await r.json();
 assert.equal(result.artists[0].name,"The Medic Droid");assert.equal(result.artists[0].plays,12);
 assert.ok(fetchURL.includes("api_key=key"));
 assert.ok(!JSON.stringify(result).includes('"key"'));
}finally{globalThis.fetch=previous}
const archiveHost="https://scene.test/api/archive";
const notAllowed=await archiveRequest({request:new Request(archiveHost+"?"+new URLSearchParams({mode:"fetch",url:"https://127.0.0.1/secrets"}))});
assert.equal(notAllowed.status,400);
const disguised=await archiveRequest({request:new Request(archiveHost+"?"+new URLSearchParams({mode:"fetch",url:"https://www.lpassociation.com.evil.example/"}))});
assert.equal(disguised.status,400);
const originalArchiveFetch=globalThis.fetch;
let fetched="";
try{
 globalThis.fetch=async url=>{
  fetched=String(url);
  if(fetched.includes("/cdx/search/cdx"))return new Response(JSON.stringify([
   ["urlkey","timestamp","original","mimetype","statuscode","digest","length"],
   ["com,example)/","20081231235959","http://example.com/","text/html","200","abc","123"]
  ]),{status:200,headers:{"content-type":"application/json"}});
  return new Response("<html><body>Saosin era archive</body></html>",{status:200,headers:{"content-type":"text/html"}});
 };
 const target="https://www.lpassociation.com/forum/threads/saosin.22761/";
 const result=await archiveRequest({request:new Request(archiveHost+"?"+new URLSearchParams({mode:"fetch",url:target}))});
 assert.equal(result.status,200);assert.ok((await result.json()).html.includes("Saosin era archive"));
 assert.ok(fetched.startsWith("https://www.lpassociation.com/"));
 const captures=await archiveRequest({request:new Request(archiveHost+"?"+new URLSearchParams({mode:"captures",url:target}))});
 assert.equal(captures.status,200);
 assert.equal((await captures.json()).captures[0].date,"2008-12-31");
 assert.ok(fetched.startsWith("https://web.archive.org/cdx/search/cdx"));
}finally{globalThis.fetch=originalArchiveFetch}
console.log("SceneIndex engine, archive safety and Last.fm proxy tests passed.");
