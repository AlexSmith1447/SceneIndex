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
 await page.locator(".ap-remote-pane").waitFor({state:"visible"});
 console.log("IMPORT_OK");
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
