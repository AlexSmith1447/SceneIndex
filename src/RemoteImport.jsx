import React,{useEffect,useRef,useState} from "react";
import {Link2,Search,Archive,Download,Plus,CheckCircle,AlertTriangle,Pause,Play,FolderSearch,CheckSquare,Square,History,ExternalLink} from "lucide-react";
import {parseHTML} from "./importers.js";
import {canonicalThreadURL,discoverThreadLinks,defaultKeywords,normalizeURLForDedupe} from "./harvest.js";

const guessName=url=>url.includes("lpassociation.com")?"LP Association Forums":url.includes("chorus.fm")?"Chorus Forums":"Archived forum";
const QUEUE_KEY="si:harvest-v2";
function parseURLs(raw){return [...new Set(raw.split(/\s+/).map(s=>s.trim()).filter(s=>/^https?:\/\//i.test(s)))].slice(0,40)}
async function api(mode,url,signal){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),18000);
 const interrupt=()=>controller.abort();signal?.addEventListener("abort",interrupt,{once:true});
 try{
  const res=await fetch("/api/archive?"+new URLSearchParams({mode,url}),{signal:controller.signal});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||"Archive server unavailable");
  return data;
 }finally{clearTimeout(timer);signal?.removeEventListener("abort",interrupt)}
}
const read=()=>{try{const r=JSON.parse(localStorage.getItem(QUEUE_KEY));return Array.isArray(r)?r.filter(x=>typeof x==="string").slice(0,50):[]}catch{return []}};
const store=queue=>{try{localStorage.setItem(QUEUE_KEY,JSON.stringify(queue.slice(0,50)))}catch{}};
export default function RemoteImport({onImported,existing=[]}){
 const [url,setUrl]=useState("https://www.lpassociation.com/forum/threads/saosin.22761/");
 const [mode,setMode]=useState("single");
 const [captures,setCaptures]=useState([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [history,setHistory]=useState([]);
 const [keywords,setKeywords]=useState(defaultKeywords);
 const [filterMatches,setFilterMatches]=useState(false);
 const [found,setFound]=useState([]);
 const [selected,setSelected]=useState([]);
 const [queue,setQueue]=useState(read);
 const [progress,setProgress]=useState({done:0,total:0});
 const abort=useRef(null),locked=useRef(false),known=useRef(new Set());
 useEffect(()=>{known.current=new Set(existing.map(x=>normalizeURLForDedupe(x.sourceUrl)).filter(Boolean))},[existing]);
 useEffect(()=>store(queue),[queue]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const changeMode=m=>{if(busy)return;setMode(m);setMessage("");setCaptures([]);if(m==="discover")setUrl("https://www.lpassociation.com/forum/forums/other-music.84/");else if(m==="single")setUrl("https://www.lpassociation.com/forum/threads/saosin.22761/")};
 async function importQueue(input){
  if(locked.current||!input.length){setMessage("No thread URLs are queued.");return}
  locked.current=true;setBusy(true);setHistory([]);setMessage("");
  const controller=new AbortController();abort.current=controller;
  const unique=[...new Map(input.filter(x=>/^https?:/.test(x)).map(x=>[normalizeURLForDedupe(x),x])).values()].slice(0,40);
  const pending=unique.filter(x=>!known.current.has(normalizeURLForDedupe(x)));
  const skipped=unique.length-pending.length;
  if(!pending.length){setMessage("These threads are already in your collection.");setBusy(false);locked.current=false;return}
  setQueue(pending);setProgress({done:0,total:pending.length});
  const logs=[],failures=[];let imported=0;
  for(let i=0;i<pending.length;i++){
   if(controller.signal.aborted)break;
   const target=pending[i];
   try{
    const result=await api("fetch",target,controller.signal);
    const parsed=parseHTML(result.html,{source:guessName(result.sourceUrl),sourceUrl:result.sourceUrl,captureUrl:result.captureUrl||null});
    if(!parsed.length)throw Error("No thread messages could be extracted");
    for(const item of parsed){
     if(known.current.has(normalizeURLForDedupe(item.sourceUrl)))continue;
     await onImported(item);
     known.current.add(normalizeURLForDedupe(item.sourceUrl));
     imported++;
    }
    logs.push({url:target,status:"Indexed "+parsed.reduce((n,t)=>n+t.posts.length,0)+" visible posts",error:false});
   }catch(e){
    if(controller.signal.aborted)break;
    logs.push({url:target,status:e.message||"Import failed",error:true});failures.push(target);
   }
   setHistory([...logs]);
   setProgress({done:i+1,total:pending.length});
   setQueue(pending.slice(i+1));
   // Be polite to public archives and avoid hammering source servers.
   if(i+1<pending.length&&!controller.signal.aborted)await new Promise(r=>setTimeout(r,850));
  }
  const remaining=[...new Set([...failures,...(controller.signal.aborted?pending.slice(logs.length):[])])];
  setQueue(remaining);
  setMessage((controller.signal.aborted?"Import paused. ":"Batch complete. ")+imported+" new thread(s) indexed. "+skipped+" already known. "+remaining.length+" unfinished/failed URL(s) preserved for retry.");
  locked.current=false;abort.current=null;setBusy(false);
 }
 async function discover(indexURL=url){
  if(locked.current)return;locked.current=true;setBusy(true);setMessage("");setFound([]);setSelected([]);
  try{
   const list=parseURLs(indexURL);if(list.length!==1)throw Error("Enter one forum index URL or historical snapshot.");
   const data=await api("fetch",list[0]);
   const links=discoverThreadLinks(data.html,data.captureUrl||data.sourceUrl,{keywords,limit:220});
   const unseen=links.filter(x=>!known.current.has(normalizeURLForDedupe(x.url)));
   setFound(unseen);
   setSelected(unseen.filter(x=>!filterMatches||x.score>0).slice(0,25).map(x=>x.url));
   setMessage("Found "+links.length+" thread links; "+unseen.length+" not already indexed. This is only the currently loaded index page, not the entire forum.");
  }catch(e){setMessage("Discovery error: "+e.message)}
  finally{locked.current=false;setBusy(false)}
 }
 async function lookup(){
  if(locked.current)return;locked.current=true;setBusy(true);setMessage("");setCaptures([]);
  try{
   const list=parseURLs(url);if(list.length!==1)throw Error("Use one URL to find archived captures.");
   const data=await api("captures",list[0]);setCaptures(data.captures||[]);
   setMessage(data.captures?.length?"Found "+data.captures.length+" snapshots. Choose one to "+(mode==="discover"?"scan for discussion links.":"import."):"No captures returned for this URL.");
  }catch(e){setMessage(e.message)}finally{locked.current=false;setBusy(false)}
 }
 function addSelected(){
  const merged=[...new Set([...queue,...selected])].filter(u=>!known.current.has(normalizeURLForDedupe(u))).slice(0,50);
  setQueue(merged);setMessage("Saved "+merged.length+" URLs to your resumable browser queue. Select Start queue to import.");
 }
 return <section className="ap-remote-pane si-harvester">
  <h3><FolderSearch size={15}/> Historical Archive Harvester <span>V2</span></h3>
  <p>Import a thread, discover discussion links on a forum index, or process an archive queue. Your saved imports stay in this browser.</p>
  <div className="si-harvest-tabs">{[["single","Single URL"],["discover","Discover threads"],["queue","Import queue"]].map(([id,label])=><button className={mode===id?"active":""} key={id} disabled={busy} onClick={()=>changeMode(id)}>{label}</button>)}</div>
  {mode!=="queue"&&<>
   <label htmlFor="ap-remote-url">{mode==="single"?"Thread URL or Wayback capture":"Forum board/index URL or Wayback snapshot"}</label>
   <textarea id="ap-remote-url" rows={2} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.lpassociation.com/forum/..." />
  </>}
  {mode==="discover"&&<div className="si-harvest-settings"><label htmlFor="si-discover-keywords">Prioritize discussions mentioning</label><input id="si-discover-keywords" value={keywords} onChange={e=>setKeywords(e.target.value)}/><label className="ap-remote-check"><input type="checkbox" checked={filterMatches} onChange={e=>setFilterMatches(e.target.checked)}/> Preselect only matching titles/context</label></div>}
  {mode!=="queue"&&<div className="ap-remote-actions">
   <button disabled={busy} onClick={()=>mode==="single"?importQueue(parseURLs(url)):discover()}>{mode==="single"?<Download size={14}/>:<Search size={14}/>} {mode==="single"?"Import this thread":"Scan this forum page"}</button>
   <button disabled={busy} onClick={lookup}><History size={14}/> Find Wayback captures</button>
  </div>}
  {captures.length>0&&<div className="ap-capture-list"><strong>Archived snapshots</strong>{captures.map(c=><button key={c.url} disabled={busy} onClick={()=>{setUrl(c.url);setCaptures([]);if(mode==="discover")discover(c.url);else importQueue([c.url])}}><Archive size={13}/>{c.date}<small>{c.timestamp}</small><Plus size={13}/></button>)}</div>}
  {mode==="discover"&&found.length>0&&<div className="si-harvest-results">
   <div className="si-harvest-results-head"><strong>{found.length} discoverable thread links</strong><button onClick={()=>setSelected(found.slice(0,30).map(x=>x.url))}>Select first 30</button><button onClick={()=>setSelected([])}>Clear</button></div>
   <div className="si-harvest-list">{found.slice(0,100).map(item=><label key={item.url}><input type="checkbox" checked={selected.includes(item.url)} onChange={e=>setSelected(old=>e.target.checked?[...old,item.url].slice(0,50):old.filter(x=>x!==item.url))}/><span><strong>{item.title}</strong><small>{item.url}</small></span>{item.score>0&&<em>{item.score} match</em>}</label>)}</div>
   <div className="si-harvest-bottom"><span>{selected.length} selected</span><button disabled={!selected.length||busy} onClick={addSelected}><Plus size={14}/> Add to import queue</button></div>
  </div>}
  {mode==="queue"&&<div className="si-queue-box"><strong>{queue.length} pending discussion URLs</strong><p>Queue is saved in this browser and can be resumed after navigating away or reopening the site. Imports run only while this page remains open.</p>
    <div className="si-queue-actions">
      <button disabled={busy||!queue.length} onClick={()=>importQueue(queue)}><Download size={14}/> Start / resume queue</button>
      <button disabled={!busy} onClick={()=>abort.current?.abort()}><Pause size={14}/> Stop safely</button>
      <button disabled={busy||!queue.length} onClick={()=>{setQueue([]);setMessage("Pending queue cleared; imported threads remain saved.")}}>Clear pending</button>
    </div>
    <div className="si-queue-preview">{queue.slice(0,8).map((u,i)=><div key={u}><span>{i+1}</span>{u}</div>)}{queue.length>8&&<small>+{queue.length-8} more</small>}</div>
  </div>}
  {busy&&progress.total>0&&<div className="si-harvest-progress"><span>Processed {progress.done} / {progress.total}</span><progress value={progress.done} max={progress.total}/></div>}
  <p className="ap-import-fineprint">Direct access: public LP Association and Chorus pages; other forums through available Wayback snapshots. Never assumes inaccessible content is archived. Index scans only extract links; importing is a separate action. Respect source rights and reasonable request rates.</p>
  {message&&<div className="ap-remote-status">{message}</div>}
  {history.length>0&&<div className="ap-remote-log">{history.map((item,i)=><div key={i} className={item.error?"error":""}>{item.error?<AlertTriangle size={14}/>:<CheckCircle size={14}/>}<span>{item.status}<small>{item.url}</small></span></div>)}</div>}
 </section>;
}
