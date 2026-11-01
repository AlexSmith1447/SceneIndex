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
 await page.setViewportSize({width:1758,height:990});
 // Cloudflare deployment follows the GitHub push asynchronously. Avoid testing an older version.
 let wideLayout;
 for(let attempt=0;attempt<24;attempt++){
  wideLayout=await page.evaluate(()=>({viewport:innerWidth,width:Math.round(document.querySelector(".si-grid").getBoundingClientRect().width),horizontal:document.documentElement.scrollWidth,hasToggle:!!document.querySelector(".si-width-choice"),siteBuild:document.querySelector(".si-app")?.dataset.siteBuild||null}));
  if(wideLayout.width>=1350&&wideLayout.hasToggle&&wideLayout.siteBuild==="forum-wide-20261101-v2")break;
  await page.waitForTimeout(5000);
  await page.reload({waitUntil:"domcontentloaded",timeout:25000});
  await page.locator(".ap-home-intro").waitFor({state:"visible",timeout:13000});
 }
 console.log("WIDE_LAYOUT",JSON.stringify(wideLayout));
 if(wideLayout.width<1350||wideLayout.siteBuild!=="forum-wide-20261101-v2")throw Error("Complete wide-site release was not observed after the deployment window");
 if(wideLayout.horizontal>wideLayout.viewport+8)throw Error("Wide desktop layout overflowed horizontally");
 await page.locator(".si-width-choice").click();
 const classicLayout=await page.evaluate(()=>Math.round(document.querySelector(".si-grid").getBoundingClientRect().width));
 console.log("CLASSIC_LAYOUT",classicLayout);
 if(classicLayout>1030||classicLayout<950)throw Error("Classic width toggle did not restore legacy proportions");
 await page.locator(".si-width-choice").click();
 const restored=await page.evaluate(()=>Math.round(document.querySelector(".si-grid").getBoundingClientRect().width));
 if(restored<1350)throw Error("Wide layout toggle did not restore full width");
 console.log("WIDTH_PREFERENCE_OK");
 const recommendations=await page.locator(".si-source-rec > div > button:first-child").allTextContents();
 if(new Set(recommendations).size!==recommendations.length)throw Error("Repeated duplicate recommendation artists in sidebar");
 console.log("DEDUPED_RECOMMENDATIONS_OK",recommendations.length);
 await page.locator(".ap-year-index button").filter({hasText:"2008"}).click();
 await page.locator(".si-filters select").nth(1).waitFor({state:"visible"});
 const selectedYear=await page.locator(".si-filters select").nth(1).inputValue();
 if(selectedYear!=="2008")throw Error("Browse by Year link failed to apply selected year: "+selectedYear);
 console.log("YEAR_FILTER_OK",selectedYear);

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
 await page.getByRole("button",{name:"Communities",exact:true}).first().click();
 await page.locator(".si-community-row").first().waitFor({state:"visible"});
 const directorySize=await page.locator(".si-community-row").count();
 if(directorySize!==16)throw Error("Expected 16 documented historical communities: "+directorySize);
 console.log("COMMUNITY_DIRECTORY_OK",directorySize);
 await page.getByRole("button",{name:"Goth / Industrial",exact:true}).click();
 await page.locator(".si-community-row").filter({hasText:"VampireFreaks"}).waitFor({state:"visible"});
 console.log("GOTH_SCENE_FILTER_OK");
 await page.getByRole("button",{name:"All scenes",exact:true}).click();
 await page.locator(".si-community-row").filter({hasText:"soEmo.co.uk"}).click();
 await page.locator(".si-community-thread-list button").first().waitFor({state:"visible"});
 const emoCount=await page.locator(".si-community-thread-list button").count();
 if(emoCount!==4)throw Error("soEmo indexed thread count wrong: "+emoCount);
 console.log("NATIVE_SOEMO_THREADS_OK",emoCount);
 await page.locator(".si-community-row").filter({hasText:"LP Association Forums"}).click();
 await page.locator(".si-community-thread-list button").filter({hasText:"Electronica/Emo-Screamo"}).click();
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
 const soemoProbe=await page.evaluate(async()=>{
  const u="https://www.soemo.co.uk/forums/topic.php?id=2800459";
  try{
   const r=await fetch("/api/archive?"+new URLSearchParams({mode:"fetch",url:u}));
   const j=await r.json();
   if(!r.ok)return {status:r.status,error:j.error||"not accessible"};
   const doc=new DOMParser().parseFromString(j.html,"text/html");
   const selectors=[".post","article",".forum-post",".forumPost",".forum_message",".forum-post-body","table","blockquote","h1","h2",".username","a[href*=users]","a[href*=profile]"];
   const tags=selectors.map(x=>[x,doc.querySelectorAll(x).length]);
   const sample=Array.from(doc.querySelectorAll(".post, article, .forumPost, table")).slice(0,3).map(n=>({tag:n.tagName,class:n.className,html:n.outerHTML.slice(0,600)}));
   return {status:r.status,title:doc.title,bytes:j.bytes,tags,sample};
  }catch(e){return {status:0,error:e.message}}
 });
 console.log("SOEMO_ORIGINAL_HTML",JSON.stringify(soemoProbe).slice(0,4000));

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

 await page.setViewportSize({width:390,height:844});
 await page.goto("https://sceneindex.pages.dev/",{waitUntil:"domcontentloaded",timeout:25000});
 await page.locator(".ap-story").first().waitFor({state:"visible",timeout:13000});
 const dims=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,firstRow:getComputedStyle(document.querySelector(".ap-story")).display}));
 console.log("MOBILE_LAYOUT",JSON.stringify(dims));
 if(dims.document>dims.viewport+8)throw Error("Mobile horizontal overflow: "+JSON.stringify(dims));
 await page.locator(".si-mobile-toggle").click();
 await page.getByRole("button",{name:"Search",exact:true}).first().click();
 await page.locator(".si-wide-search input").waitFor({state:"visible"});
 console.log("MOBILE_NAV_OK");
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
