// Browser ZIP collection importer (bounded by file size / number of files).
// No direct import of unbounded WARC here; use the streaming offline converter.
import {unzipSync, strFromU8} from "fflate";
import {parseHTML,parseJSON} from "./importers.js";

const maxZip=24*1024*1024,maxInflated=80*1024*1024,maxMember=2*1024*1024,maxFiles=300;
const fileNames=s=>/\.(?:html?|json)$/i.test(s)&&!/(?:^|\/)(?:__MACOSX|\.git)\//i.test(s);
function hash(s){let n=2166136261;for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619)}return (n>>>0).toString(36)}
export function recognizeBundleFile(file){
 const n=file.name.toLowerCase();
 if(n.endsWith(".zip"))return "zip";
 if(n.endsWith(".html")||n.endsWith(".htm"))return "html";
 if(n.endsWith(".json"))return "json";
 if(/\.(?:warc(?:\.gz|\.zst)?|tar(?:\.gz)?|7z|rar)$/i.test(n))return "offline";
 return null;
}
export async function parseArchiveBundle(file,{sourceName=""}={}){
 const kind=recognizeBundleFile(file);
 if(!kind)throw Error("Unsupported archive file. Use .zip, .html or SceneIndex .json.");
 if(kind==="offline")throw Error("WARC, TAR, 7z and RAR archives require offline conversion. Use the SceneIndex WARC converter or extract them to a ZIP of HTML files.");
 if(file.size>maxZip)throw Error("The browser importer limits files to 24 MB compressed. For larger collections, use the offline converter and split the bundle.");
 const buffer=new Uint8Array(await file.arrayBuffer());
 let accepted=0,inflated=0;
 const entries=kind==="zip"?unzipSync(buffer,{filter:e=>{if(e.originalSize>maxMember||!fileNames(e.name)&&e.name!=="sceneindex-manifest.json")return false;accepted++;inflated+=e.originalSize;return accepted<=maxFiles+1&&inflated<=maxInflated}}):{[file.name]:buffer};
 const list=Object.entries(entries).filter(([name])=>fileNames(name));
 if(list.length>maxFiles)throw Error("Archive contains too many HTML/JSON files. Split into bundles of 300 or fewer pages.");
 if(!list.length)throw Error("No small HTML or JSON pages were found inside the archive.");
 const total=list.reduce((n,[,data])=>n+data.length,0);
 if(total>maxInflated)throw Error("Decompressed files exceed the 80 MB in-browser limit.");
 const metadata=entries["sceneindex-manifest.json"]?JSON.parse(strFromU8(entries["sceneindex-manifest.json"])):{};
 const manifest=new Map((Array.isArray(metadata.pages)?metadata.pages:[]).map(p=>[p.filename,p]));
 const threads=[],report=[];
 const seen=new Set();
 for(const [name,data] of list){
  if(name==="sceneindex-manifest.json")continue;
  try{
   const info=manifest.get(name)||{};
   const raw=strFromU8(data);
   const doc=name.toLowerCase().endsWith(".json")?null:new DOMParser().parseFromString(raw,"text/html");
   const canonical=doc?.querySelector('link[rel="canonical"]')?.getAttribute("href")||doc?.querySelector('meta[property="og:url"]')?.getAttribute("content")||"";
   const sourceUrl=info.sourceUrl||canonical||"";
   const captureUrl=info.captureUrl||"";
   const parsed=name.toLowerCase().endsWith(".json")?parseJSON(raw):parseHTML(raw,{source:info.source||sourceName||metadata.source||file.name,sourceUrl,captureUrl,captureDate:info.captureDate||null});
   for(const t of parsed){
    // File-hash identity makes archives repeat-importable without random duplicates.
    if(!t.sourceUrl)t.id="bundle-"+hash(name+"::"+raw.slice(0,20000));
    t.archiveFile=name;
    t.archivePackage=metadata.identifier||file.name;
    const key=t.sourceUrl?.toLowerCase().replace(/\/+$/,"")||t.id;
    if(seen.has(key))continue;
    seen.add(key);threads.push(t);
   }
   report.push({file:name,ok:true,count:parsed.length});
  }catch(e){report.push({file:name,ok:false,error:e.message})}
 }
 return {threads,report,scanned:list.length,failed:report.filter(x=>!x.ok).length,archiveName:file.name};
}
