import React,{useState} from "react";
import {Link2,Search,Archive,Download,Plus,Loader2,CheckCircle,AlertTriangle,ExternalLink} from "lucide-react";
import {parseHTML} from "./importers.js";

const guessName=url=>url.includes("lpassociation.com")?"LP Association Forums":url.includes("chorus.fm")?"Chorus Forums":"Archived forum";
function parseURLs(raw){
 return [...new Set(raw.split(/\s+/).map(x=>x.trim()).filter(x=>/^https?:\/\//i.test(x)))].slice(0,12);
}
async function api(mode,url){
 const res=await fetch("/api/archive?"+new URLSearchParams({mode,url}),{signal:AbortSignal.timeout(16500)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||"Archive server unavailable");
 return data;
}
export default function RemoteImport({onImported,existing=[]}){
 const [url,setUrl]=useState("https://www.lpassociation.com/forum/threads/saosin.22761/");
 const [captures,setCaptures]=useState([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [history,setHistory]=useState([]);
 const [allowBatch,setAllowBatch]=useState(false);
 async function runImport(urls){
  setBusy(true);setHistory([]);setMessage("");
  let successes=0;const logs=[];
  for(const u of urls){
   try{
    const result=await api("fetch",u);
    const threads=parseHTML(result.html,{source:guessName(result.sourceUrl),sourceUrl:result.sourceUrl});
    const added=[];
    for(const t of threads){
     if(existing.some(x=>x.sourceUrl&&x.sourceUrl===t.sourceUrl)){logs.push({url:u,status:"Already imported"});continue}
     await onImported(t);added.push(t);
    }
    if(added.length){successes+=added.length;logs.push({url:u,status:"Imported "+added.length+" thread(s) with "+added.reduce((n,t)=>n+t.posts.length,0)+" readable posts"})}
   }catch(e){logs.push({url:u,status:e.message,error:true})}
   setHistory([...logs]);
  }
  setMessage(successes?"Imported "+successes+" thread(s). Review the extracted text and attribution before sharing.":"No new threads were imported.");
  setBusy(false);
 }
 async function lookup(){
  setBusy(true);setMessage("");setCaptures([]);
  try{
   const urls=parseURLs(url);if(urls.length!==1)throw Error("Use a single URL for Wayback lookup.");
   const data=await api("captures",urls[0]);setCaptures(data.captures||[]);
   setMessage(data.captures?.length?"Found "+data.captures.length+" archived captures. Choose one to import.":"No available captures were returned. Try a saved HTML file.");
  }catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 return <section className="ap-remote-pane"><h3><Link2 size={15}/> Import a historical forum URL <span>NEW</span></h3>
  <p>Fetch surviving discussion pages from supported forums or archived Wayback captures. Nothing is imported until you choose it.</p>
  <label htmlFor="ap-remote-url">Forum URL or Wayback snapshot URL</label>
  <textarea id="ap-remote-url" rows={allowBatch?4:2} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.lpassociation.com/forum/threads/..." />
  <label className="ap-remote-check"><input checked={allowBatch} onChange={e=>setAllowBatch(e.target.checked)} type="checkbox"/> Batch mode (one URL per line; maximum 12)</label>
  <div className="ap-remote-actions">
   <button disabled={busy} onClick={()=>runImport(parseURLs(url))}><Download size={14}/>{busy?"Fetching…":allowBatch?"Import these URLs":"Import this URL"}</button>
   <button disabled={busy||allowBatch} onClick={lookup}><Search size={14}/> Find Wayback captures</button>
  </div>
  <p className="ap-import-fineprint">Direct retrieval supports public LP Association and Chorus pages. Other forums can be imported through Wayback capture links or saved HTML. Unavailable or blocked sites return a clear error; this does not crawl entire sites.</p>
  {captures.length>0&&<div className="ap-capture-list"><strong>Archived copies</strong>{captures.map(c=><button key={c.url} disabled={busy} onClick={()=>runImport([c.url])}><Archive size={13}/>{c.date}<small>{c.timestamp}</small><Plus size={13}/></button>)}</div>}
  {message&&<div className="ap-remote-status">{message}</div>}
  {history.length>0&&<div className="ap-remote-log">{history.map((row,i)=><div key={i} className={row.error?"error":""}>{row.error?<AlertTriangle size={14}/>:<CheckCircle size={14}/>}<span>{row.status}<small>{row.url}</small></span></div>)}</div>}
 </section>
}
