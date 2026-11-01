import {chromium} from "playwright-core";
import {writeFileSync} from "node:fs";
const browser=await chromium.launch({headless:true,executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
const page=await browser.newPage({viewport:{width:1365,height:950},deviceScaleFactor:1});
const faults=[];
page.on("pageerror",error=>faults.push(error.message));
try{
 const response=await page.goto("https://sceneindex.pages.dev/",{waitUntil:"domcontentloaded",timeout:30000});
 if(!response.ok())throw Error("Site failed HTTP: "+response.status());
 await page.locator(".ap-home-intro").waitFor({state:"visible",timeout:20000});
 if((await page.locator(".ap-story").count())<11)throw Error("Expected eleven sourced historical discussions");
 await page.screenshot({path:"/tmp/sceneindex-home.jpg",type:"jpeg",quality:83,fullPage:false});
 console.log("HOME_OK",await page.locator(".ap-story").count());
 await page.getByRole("button",{name:"Search",exact:true}).first().click();
 await page.locator(".si-wide-search input").waitFor({state:"visible"});
 await page.locator(".si-wide-search input").fill("Medic Droid");
 const matches=await page.locator(".si-thread-row").count();
 if(matches<1)throw Error("Forum search returned no Medic Droid threads");
 console.log("SEARCH_OK",matches);
 await page.getByRole("button",{name:"Discover",exact:true}).first().click();
 await page.locator(".si-taste form input").fill("Sky Eats Airplane");
 await page.getByRole("button",{name:"Add artist",exact:true}).click();
 await page.getByRole("button",{name:/The Medic Droid/}).first().waitFor({state:"visible",timeout:10000});
 console.log("DISCOVERY_OK");
 await page.getByRole("button",{name:"Sources",exact:true}).first().click();
 await page.getByRole("button",{name:/Electronica\/Emo-Screamo/}).first().click();
 await page.locator(".si-post").first().waitFor({state:"visible",timeout:10000});
 if((await page.locator(".si-post").count())!==2)throw Error("Wrong number of source thread messages");
 console.log("THREAD_OK");
 await page.getByRole("button",{name:"Import",exact:true}).first().click();
 await page.locator(".si-import-tabs").waitFor({state:"visible"});
 await page.locator(".si-packages").waitFor({state:"visible"});
 await page.locator(".si-packages-search input").fill("emo forum");
 await page.locator(".si-packages-search button").click();
 await page.waitForTimeout(1500);
 const archiveLookup=await page.locator(".si-package-count,.si-package-notice").first().textContent().catch(()=>"Archive search unavailable");
 console.log("ARCHIVE_ITEM_LOOKUP",archiveLookup?.slice(0,170));
 // Test an actual ZIP bundle, not just the presence of an upload button.
 const {zipSync,strToU8}=await import("fflate");
 const sample='<html><head><title>Test demo conversation</title></head><body><h1>Test demo conversation</h1><article class="message" data-author="FixtureUser"><time datetime="2008-06-10">June 10, 2008</time><div class="bbWrapper">This is a test archive entry discussing a demo from an imaginary forum.</div></article></body></html>';
 const manifest=JSON.stringify({format:"sceneindex-bundle-v1",pages:[{filename:"pages/test.html",sourceUrl:"https://archive-fixture.example/threads/demo",source:"Isolated Browser Test",captureDate:"2019-01-01"}]});
 const zip=zipSync({"pages/test.html":strToU8(sample),"sceneindex-manifest.json":strToU8(manifest)});
 await page.locator(".si-package-upload input").setInputFiles({name:"test-archive.zip",mimeType:"application/zip",buffer:Buffer.from(zip)});
 await page.locator(".si-package-notice").filter({hasText:"Indexed 1 thread"}).waitFor({state:"visible",timeout:13000});
 console.log("ZIP_ARCHIVE_IMPORT_OK");
 await page.locator(".ap-remote-pane").waitFor({state:"visible"});
 console.log("IMPORT_OK");
 const rawProbe=await page.evaluate(async()=>{
   const target="https://www.lpassociation.com/forum/threads/saosin.22761/";
   try {
     const r=await fetch("/api/archive?"+new URLSearchParams({mode:"fetch",url:target}));
     const j=await r.json();
     return {ok:r.ok,status:r.status,bytes:j.bytes||0,error:j.error||null,hasSaosin:!!j.html?.includes("Saosin")};
   }catch(e){return {ok:false,status:0,error:e.message}}
 });
 console.log("ARCHIVE_PROXY_PROBE",JSON.stringify(rawProbe));
 await page.locator(".ap-remote-pane textarea").fill("https://www.lpassociation.com/forum/threads/best-album-of-06.20379/");
 await page.locator(".ap-remote-actions button").first().click();
 const importStatus=await page.locator(".ap-remote-status").innerText({timeout:25000}).catch(()=>"No import status");
 console.log("IMPORT_URL_RESULT",importStatus);
 const capturesProbe=await page.evaluate(async()=>{
  try{
    const u="https://www.lpassociation.com/forum/threads/saosin.22761/";
    const r=await fetch("/api/archive?"+new URLSearchParams({mode:"captures",url:u}));
    const data=await r.json();
    return {status:r.status,count:data.captures?.length||0,error:data.error||null};
  }catch(e){return {status:0,error:e.message}}
 });
 console.log("WAYBACK_PROBE",JSON.stringify(capturesProbe));
 const snapshotProbe=await page.evaluate(async()=>{
  const target="https://www.lpassociation.com/forum/threads/saosin.22761/";
  try{
   const a=await fetch("/api/archive?"+new URLSearchParams({mode:"captures",url:target}));
   const j=await a.json();if(!j.captures?.length)return {status:0,error:"No captures"};
   const b=await fetch("/api/archive?"+new URLSearchParams({mode:"fetch",url:j.captures[0].url}));
   const k=await b.json();
   return {status:b.status,ok:b.ok,bytes:k.bytes||0,error:k.error||null};
  }catch(e){return {status:0,error:e.message}}
 });
 console.log("WAYBACK_SNAPSHOT_FETCH",JSON.stringify(snapshotProbe));
 if(importStatus.includes("1 new thread(s) indexed"))console.log("IMPORT_URL_SUCCESS");
 if(!importStatus.includes("indexed"))throw Error("URL import failed: "+importStatus);
 await page.getByRole("button",{name:"Discover threads",exact:true}).click();
 await page.locator(".ap-remote-actions button").first().click();
 await page.locator(".ap-remote-status").filter({hasText:"Found"}).waitFor({state:"visible",timeout:30000});
 const discovered=await page.locator(".si-harvest-list label").count();
 if(discovered<2)throw Error("Board scan produced too few indexed discussion links: "+discovered);
 console.log("FORUM_INDEX_SCAN_OK",discovered);
 await page.locator(".si-harvest-results-head button").first().click();
 await page.locator(".si-harvest-bottom button").click();
 await page.getByRole("button",{name:"Import queue",exact:true}).click();
 const pending=await page.locator(".si-queue-preview>div").count();
 if(!pending)throw Error("Archive queue was empty after adding discovered links");
 console.log("QUEUE_CREATED_OK",pending);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.getByRole("button",{name:"Import",exact:true}).first().click();
 await page.getByRole("button",{name:"Import queue",exact:true}).click();
 const resumed=await page.locator(".si-queue-preview>div").count();
 if(!resumed)throw Error("Archive queue did not survive reload");
 console.log("QUEUE_RESUME_OK",resumed);

 if(!rawProbe.ok)console.log("ARCHIVE_PROXY_WARNING",rawProbe.error);

 if(faults.length)throw Error("Frontend exceptions: "+faults.join(" | "));
 console.log("NO_JS_ERRORS");
}catch(error){console.error(error);console.error("BROWSER_FAULTS",JSON.stringify(faults));process.exitCode=1}
finally{
 await browser.close();
 try{
  const b64=(await import("node:fs")).readFileSync("/tmp/sceneindex-home.jpg").toString("base64");
  console.log("SCENEIMAGE_START");console.log(b64);console.log("SCENEIMAGE_END");
 }catch{}
}
