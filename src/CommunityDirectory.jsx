import React,{useEffect,useMemo,useState} from "react";
import {communities,sceneSections,matchCommunity} from "./communities.js";
import {ExternalLink,FolderOpen,Archive,Search,BookOpen,ChevronRight} from "lucide-react";

const indexedFor=(forum,threads)=>threads.filter(t=>matchCommunity(t.source)===forum.id);
function sceneNames(community){return community.scenes.map(id=>sceneSections.find(s=>s.id===id)?.name||id)}
export default function CommunityDirectory({threads,onOpen,onNavigate,initialScene="all",initialForum=null}){
 const [scene,setScene]=useState(initialScene),[term,setTerm]=useState("");
 const [active,setActive]=useState(initialForum||"lpa");
 const [onlyIndexed,setOnlyIndexed]=useState(false);
 useEffect(()=>setScene(initialScene),[initialScene]);
 useEffect(()=>{if(initialForum)setActive(initialForum)},[initialForum]);
 const visible=useMemo(()=>communities.filter(c=>(scene==="all"||c.scenes.includes(scene))&&(!onlyIndexed||indexedFor(c,threads).length)&&(!term.trim()||[c.name,c.kind,c.focus,c.era,...sceneNames(c)].join(" ").toLowerCase().includes(term.toLowerCase().trim()))),[scene,term,onlyIndexed,threads]);
 const chosen=visible.find(c=>c.id===active)||visible[0]||null;
 const selectedThreads=chosen?indexedFor(chosen,threads):[];
 const uniqueIndexed=new Set(threads.map(t=>matchCommunity(t.source)).filter(Boolean)).size;
 return <div className="si-communities">
  <div className="si-community-title"><div><h1>Community directory</h1><p>Original forums and music communities, sorted by the scenes they actually served.</p></div><span>{communities.length} documented communities · {uniqueIndexed} with indexed material</span></div>
  <div className="si-community-controls">
   <label htmlFor="si-community-search">Search communities</label>
   <div className="si-community-search"><Search size={14}/><input id="si-community-search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search forums, subcultures, scenes…"/></div>
   <label className="si-community-indexed-toggle"><input type="checkbox" checked={onlyIndexed} onChange={e=>setOnlyIndexed(e.target.checked)}/> Show indexed discussions only</label>
  </div>
  <div className="si-community-scene-tabs" role="group" aria-label="Filter communities by scene">
   <button className={scene==="all"?"selected":""} onClick={()=>setScene("all")}>All scenes</button>
   {sceneSections.map(s=><button key={s.id} className={scene===s.id?"selected":""} onClick={()=>setScene(s.id)}>{s.name}</button>)}
  </div>
  {scene!=="all"&&<p className="si-community-scene-note">{sceneSections.find(s=>s.id===scene)?.about}</p>}
  <div className="si-community-grid">
   <div className="si-community-index">
    <div className="si-directory-header"><strong>Community</strong><span>Indexed</span></div>
    {visible.length?visible.map(c=>{
      const n=indexedFor(c,threads).length;
      return <button key={c.id} className={"si-community-row"+(chosen?.id===c.id?" active":"")} onClick={()=>setActive(c.id)}>
       <span className="si-forum-marker">▤</span>
       <span className="si-community-row-name"><strong>{c.name}</strong><small>{c.era} · {c.kind}</small></span>
       <span className="si-community-row-count">{n||"—"}</span>
      </button>
    }):<div className="si-directory-empty">No matching communities. Try another scene or clear the search.</div>}
    <div className="si-directory-foot">An unindexed community is a documented historical site, not a fictional forum. Only imported or source-verified discussions appear in the local archive.</div>
   </div>
   <section className="si-community-detail">
    {chosen?<><div className="si-community-detail-head">
      <div><span className="si-community-kicker">Community record / {chosen.era}</span><h2>{chosen.name}</h2><p>{chosen.kind}</p></div>
      <span className={"si-community-state"+(selectedThreads.length?" indexed":"")}>{selectedThreads.length?selectedThreads.length+" indexed":"Not indexed"}</span>
    </div>
    <div className="si-community-description">{chosen.focus}</div>
    <div className="si-community-tags">{sceneNames(chosen).map(name=><span key={name}>{name}</span>)}</div>
    <div className="si-community-record-note"><strong>Archive note:</strong> {chosen.note}</div>
    <div className="si-community-links">
      <a href={chosen.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/> {chosen.url.includes("web.archive.org")?"View captured site":"Original / current site"}</a>
      <a href={chosen.archive} target="_blank" rel="noopener noreferrer"><Archive size={13}/> Wayback snapshots</a>
      <a href={chosen.evidence} target="_blank" rel="noopener noreferrer"><BookOpen size={13}/> Historical evidence</a>
    </div>
    <div className="si-community-thread-head"><strong>Discussions preserved in SceneIndex</strong><span>{selectedThreads.length}</span></div>
    {selectedThreads.length?<div className="si-community-thread-list">{[...selectedThreads].sort((a,b)=>b.date.localeCompare(a.date)).map(t=><button key={t.id} onClick={()=>onOpen(t.id)}>
       <span><strong>{t.title}</strong><small>{t.board} · {t.dateBasis==="unknown"?"date unknown":t.date} · {t.origin==="verified-paraphrase"?"Editorial summary":"Imported source"}</small></span><ChevronRight size={14}/>
      </button>)}</div>:<div className="si-community-no-posts"><strong>Documented, not yet indexed</strong><p>This community was genuinely active, but SceneIndex doesn't have source-checked discussion records to show here yet. Original pages or public snapshots may exist; a complete dump has not been established.</p></div>}
    <div className="si-community-bottom"><button onClick={()=>onNavigate("import")}><FolderOpen size={13}/> Add preserved discussions</button></div>
    </>:<div className="si-directory-empty">Select a community or widen the filters.</div>}
   </section>
  </div>
 </div>
}
