import React,{useState} from "react";
import {Archive,Search,Download,FolderOpen,Upload,ExternalLink,FileArchive,ChevronDown,ChevronRight} from "lucide-react";
import {parseArchiveBundle,recognizeBundleFile} from "./bundleImport.js";

const size=n=>n>=1e9?(n/1e9).toFixed(1)+" GB":n>=1e6?(n/1e6).toFixed(1)+" MB":n>=1e3?(n/1e3).toFixed(0)+" KB":n+" B";
async function get(params){
 const r=await fetch("/api/collections?"+new URLSearchParams(params));
 const j=await r.json();
 if(!r.ok)throw Error(j.error||"Archive catalogue unavailable");
 return j;
}
export default function ArchivePackages({onImported}){
 const [q,setQ]=useState("emo forum"),[found,setFound]=useState([]),[total,setTotal]=useState(null);
 const [chosen,setChosen]=useState(null),[files,setFiles]=useState([]);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState("");
 const [report,setReport]=useState(null),[expanded,setExpanded]=useState(false);
 const [source,setSource]=useState("");
 async function search(e){
  e?.preventDefault();setBusy(true);setStatus("");setFound([]);setChosen(null);setFiles([]);
  try{const data=await get({mode:"search",q:q.trim()});setFound(data.items);setTotal(data.total);
   if(!data.items.length)setStatus("No matching archive items. Try another forum name or search phrase.")}
  catch(e){setStatus(e.message)}finally{setBusy(false)}
 }
 async function inspect(id){
  setBusy(true);setStatus("");setChosen(null);setFiles([]);
  try{const data=await get({mode:"files",id});setChosen(data);setFiles(data.files||[]);
   if(!data.files.length)setStatus("No compatible downloadable files are listed for this item. Try another collection.")}
  catch(e){setStatus(e.message)}finally{setBusy(false)}
 }
 function openIdentifier(e){
  e.preventDefault();
  const val=source.trim();
  const match=val.match(/(?:archive\.org\/(?:details|download)\/)?([a-zA-Z0-9_.-]{2,160})(?:[/?#]|$)/);
  if(!match){setStatus("Paste an archive.org/details/... URL or an exact archive item identifier.");return}
  inspect(match[1]);
 }
 async function openFile(e){
  const f=e.target.files?.[0];if(!f)return;
  setStatus("");setReport(null);setBusy(true);
  try{
   const kind=recognizeBundleFile(f);
   if(kind==="offline")throw Error("This format needs offline conversion. Download the archive and use scripts/warc_to_bundle.py for WARC dumps, or extract the archive into a ZIP of HTML files.");
   const parsed=await parseArchiveBundle(f);
   if(!parsed.threads.length)throw Error("No readable forum threads found. "+parsed.failed+" files could not be parsed. The ZIP may contain an unsupported forum layout or index pages rather than threads.");
   const failures=[];let added=0;
   for(const item of parsed.threads){
    try{await onImported(item);added++}catch(err){failures.push(item.title+": "+err.message)}
   }
   setReport({...parsed,added,failures});
   setStatus("Indexed "+added+" thread(s) from "+parsed.archiveName+" in this browser. "+parsed.failed+" files could not be parsed; review the report below.");
  }catch(e){setStatus(e.message)}finally{setBusy(false);e.target.value=""}
 }
 return <section className="si-packages">
  <div className="si-packages-title"><strong>Existing archive collections</strong><span>Internet Archive catalogue · local file importing</span></div>
  <div className="si-packages-intro">Someone may already have archived the forum you want. Search for a downloadable collection, inspect its files, then import saved forum pages into SceneIndex. Archives from 2019 or 2020 work just as well as earlier captures.</div>
  <div className="si-packages-body">
   <form className="si-packages-search" onSubmit={search}><label htmlFor="si-package-query">Search archive.org items</label><div><input id="si-package-query" value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. emo forum, AbsolutePunk, vBulletin"/><button disabled={busy||q.trim().length<2}><Search size={13}/> Search</button></div></form>
   <form className="si-package-direct" onSubmit={openIdentifier}><label htmlFor="si-package-id">Already have an archive.org item?</label><div><input id="si-package-id" value={source} onChange={e=>setSource(e.target.value)} placeholder="archive.org/details/item-identifier"/><button disabled={busy}>Inspect</button></div></form>
   {total!==null&&<div className="si-package-count">{total} item(s) matched the catalogue query. Showing up to 20; check the item before assuming it contains forum posts.</div>}
   {found.length>0&&<div className="si-package-results">{found.map(item=><div key={item.identifier} className="si-package-row"><div><strong>{item.title}</strong><small>{item.identifier} {item.year?"· "+item.year:""}</small>{item.description&&<p>{item.description}</p>}</div><button disabled={busy} onClick={()=>inspect(item.identifier)}>Files <ChevronRight size={12}/></button></div>)}</div>}
   {chosen&&<div className="si-package-files"><div className="si-package-files-title"><strong>{chosen.title}</strong><a href={chosen.detailUrl} target="_blank" rel="noopener noreferrer">Archive.org item <ExternalLink size={12}/></a></div>{files.map(f=><div key={f.name} className="si-package-file"><span><FileArchive size={14}/><strong>{f.name}</strong><small>{size(f.size)} · {f.format||"archive"}</small></span><a href={f.downloadUrl} target="_blank" rel="noopener noreferrer">Download <Download size={12}/></a></div>)}<p>Files are hosted by Internet Archive, not SceneIndex. Some may be restricted, incomplete, or too large for a browser.</p></div>}
   <div className="si-package-import"><div><strong>Import a downloaded archive</strong><p>ZIP of saved HTML threads, individual HTML pages, or SceneIndex JSON. Files are processed locally. WARC/WARC.GZ uses the offline converter.</p></div>
    <label className="si-package-upload">{busy?"Processing…":"Choose archive file"} <Upload size={13}/><input type="file" disabled={busy} accept=".zip,.html,.htm,.json,.warc,.gz,.zst,.7z,.tar" onChange={openFile}/></label>
   </div>
   {status&&<div className="si-package-notice">{status}</div>}
   {report&&<div className="si-package-report"><button onClick={()=>setExpanded(!expanded)}>{report.added} threads indexed · {report.scanned} files checked · {report.failed} extraction failures {expanded?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button>{expanded&&<div>{report.report.slice(0,100).map((x,i)=><div key={i} className={x.ok?"ok":"bad"}>{x.ok?"OK":"Skipped"}: {x.file}{!x.ok?" — "+x.error:""}</div>)}{report.failures.map((x,i)=><div className="bad" key={"f"+i}>Storage: {x}</div>)}</div>}</div>}
   <div className="si-package-foot">Large WARC download? <a href="https://github.com/AlexSmith1447/SceneIndex/blob/main/docs/ARCHIVE_PACKAGES.md" target="_blank" rel="noopener noreferrer">Read the offline conversion guide</a>. The site does not rehost third-party archives.</div>
  </div>
 </section>
}
