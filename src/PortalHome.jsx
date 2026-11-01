import React from "react";
import {threadArtists,buildGraph,stats} from "./engine.js";

const art={
 saosin:{src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Saosin_live_on_Projekt_Revolution_tour.jpg?width=460",credit:"Wikimedia Commons · 2007",page:"https://commons.wikimedia.org/wiki/File:Saosin_live_on_Projekt_Revolution_tour.jpg",artist:"Saosin"},
 tbs:{src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Taking_Back_Sunday_live_in_Boston.jpg?width=460",credit:"Debs · CC BY 2.0 · 2007",page:"https://commons.wikimedia.org/wiki/File:Taking_Back_Sunday_live_in_Boston.jpg",artist:"Taking Back Sunday"}
};
function Picture({photo}){
 return <a className="ap-photo" href={photo.page} target="_blank" rel="noopener noreferrer" title={"Source: "+photo.credit}>
  <img loading="lazy" src={photo.src} alt={photo.artist+" performing live in 2007"} onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement.classList.add("ap-photo-unavailable")}}/>
  <span className="ap-photo-backup">View original concert photo</span>
 </a>
}
function Box({title,children,extra}){return <section className="ap-box"><h2 className="ap-head"><span>{title}</span>{extra}</h2>{children}</section>}
export function PortalHeaderArt(){
 return <div className="ap-header-strip">
  <div className="ap-mast-pic"><img src={art.tbs.src} alt="Taking Back Sunday in 2007" onError={e=>e.currentTarget.style.display="none"}/></div>
  <div className="ap-mast-pic"><img src={art.saosin.src} alt="Saosin in 2007" onError={e=>e.currentTarget.style.display="none"}/></div>
  <div className="ap-mast-type"><strong>FORUM ARCHIVES</strong><span>Music discussion · 2000–2010</span><small>Source-linked historical conversations</small></div>
 </div>
}
export function PortalAside({onArtist,onNavigate,threads=[]}){
 const s=stats(threads);
 return <div className="ap-aside-top">
  <Box title="Photo Archive">
   <Picture photo={art.tbs}/>
   <div className="ap-photo-credits">2007 · <a href={art.tbs.page} target="_blank" rel="noopener noreferrer">Debs (CC BY 2.0)</a></div>
   <button className="ap-feature-name" onClick={()=>onArtist("Taking Back Sunday")}>Taking Back Sunday</button>
  </Box>
  <Box title="Archive Statistics"><div className="ap-archive-stats"><div><b>{s.threads}</b> indexed discussions</div><div><b>{s.posts}</b> preserved post excerpts</div><div><b>{s.sources}</b> source communities</div></div><button className="ap-side-plain" onClick={()=>onNavigate("sources")}>Browse sources »</button></Box>
 </div>;
}
const isKnownDate=t=>t.dateBasis!=="unknown"&&Number(t.year)>=1900;
const humanDate=t=>!isKnownDate(t)?"date unknown":t.dateBasis==="capture"?"captured "+t.date:t.date;
function Listing({threads,onOpen}){
 return <div className="ap-thread-table"><div className="ap-thread-columns"><span>Discussion / source</span><span>Posts</span><span>Date</span></div>
 {threads.map(t=><article className="ap-story" key={t.id}>
  <div className="ap-story-title-row"><span className="ap-thread-forum">▣</span><div className="ap-story-main"><button className="ap-story-title" onClick={()=>onOpen(t.id)}>{t.title}</button><div className="ap-story-description">{(t.posts?.[0]?.text||"").slice(0,130)}{(t.posts?.[0]?.text||"").length>130?"…":""}</div><div className="ap-story-sourceline">{t.source} · {t.board} · {t.origin==="verified-paraphrase"?"source-linked summary":"imported archive"}</div></div></div>
  <span className="ap-story-replies">{t.posts?.length||0}</span>
  <span className="ap-story-date">{humanDate(t)}</span>
 </article>)}
 </div>
}
export default function PortalHome({threads,onOpen,onNavigate,onArtist}){
 const ordered=[...threads].sort((a,b)=>(isKnownDate(b)?b.date:"0000").localeCompare(isKnownDate(a)?a.date:"0000"));
 const sources=[...new Set(ordered.map(t=>t.source))];
 const years=[...new Set(ordered.filter(isKnownDate).map(t=>t.year))].sort((a,b)=>b-a);
 const graph=buildGraph(threads);
 const recommended=graph.edges.filter(x=>x.recommendationCount>0).sort((a,b)=>b.recommendationCount-a.recommendationCount||b.weight-a.weight).slice(0,4);
 return <div className="ap-home">
  <div className="ap-home-intro"><strong>SceneIndex.net</strong><span>Forum index &gt; Music discussion</span><button onClick={()=>onNavigate("search")}>Search archive »</button></div>
  <div className="ap-home-grid">
   <aside className="ap-left">
    <Box title="Forum Directory"><div className="ap-directory">{sources.map(source=><button key={source} onClick={()=>onNavigate("sources")}><b>▣</b><span>{source}</span><small>{threads.filter(t=>t.source===source).length}</small></button>)}</div></Box>
    <Box title="Browse by Year"><div className="ap-year-index">{years.map(y=><button key={y} onClick={()=>onNavigate("search")}>{y}<small>{threads.filter(t=>t.year===y).length} threads</small></button>)}</div></Box>
    <Box title="Live Archives"><Picture photo={art.saosin}/><div className="ap-photo-credits">Saosin, 2007 · <a href={art.saosin.page} target="_blank" rel="noopener noreferrer">Photo source</a></div><button className="ap-feature-name" onClick={()=>onArtist("Saosin")}>View Saosin discussions »</button></Box>
    <Box title="Tools"><div className="ap-side-links"><button onClick={()=>onNavigate("import")}>Import an existing archive</button><button onClick={()=>onNavigate("discover")}>Compare music taste</button><button onClick={()=>onNavigate("search")}>Search all threads</button></div></Box>
   </aside>
   <div className="ap-center">
    <Box title="Forum Discussions" extra={<button className="ap-head-action" onClick={()=>onNavigate("search")}>Advanced Search »</button>}>
      <Listing threads={ordered.slice(0,60)} onOpen={onOpen}/>
    </Box>
    {recommended.length>0&&<Box title="Recommendations Found in Threads" extra={<button className="ap-head-action" onClick={()=>onNavigate("discover")}>More »</button>}>
      <div className="ap-authentic-rec-list">{recommended.map((edge,i)=><div key={i}><button onClick={()=>onArtist(edge.artists[1])}>{edge.artists[1]}</button><span>mentioned alongside <b>{edge.artists[0]}</b> · {edge.recommendationCount} direct recommendation(s)</span><button onClick={()=>onOpen(edge.evidence[0].threadId)}>View post »</button></div>)}</div>
    </Box>}
    <div className="ap-bottom-note">Historical excerpts are labeled as summaries where appropriate. Original sources are linked inside each discussion.</div>
   </div>
  </div>
 </div>
}
