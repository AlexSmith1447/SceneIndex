import React from "react";
import {MessageSquare,ExternalLink,Music2,Star,FolderOpen,ArrowRight,CompactDisc,Bookmark} from "lucide-react";

export const art={
 saosin:{src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Saosin_live_on_Projekt_Revolution_tour.jpg?width=460",credit:"2007 concert photo · Wikimedia Commons",page:"https://commons.wikimedia.org/wiki/File:Saosin_live_on_Projekt_Revolution_tour.jpg",artist:"Saosin"},
 tbs:{src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Taking_Back_Sunday_live_in_Boston.jpg?width=460",credit:"Debs · CC BY 2.0 · 2007",page:"https://commons.wikimedia.org/wiki/File:Taking_Back_Sunday_live_in_Boston.jpg",artist:"Taking Back Sunday"}
};
function Picture({photo,alt}){return <a href={photo.page} target="_blank" rel="noopener noreferrer" title={"Photo credit: "+photo.credit} className="ap-photo"><img src={photo.src} alt={alt||photo.artist} loading="lazy" onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement.classList.add("ap-photo-unavailable")}}/><span className="ap-photo-backup">Photo source <ExternalLink size={12}/></span></a>}
function PortalBox({name,children,right}){return <section className="ap-box"><h2 className="ap-head"><span>{name}</span>{right}</h2>{children}</section>}
export function PortalHeaderArt(){
 return <div className="ap-header-strip">
  <div className="ap-mast-pic"><img src={art.saosin.src} alt="Saosin performing in 2007" onError={e=>e.currentTarget.style.display="none"}/></div>
  <div className="ap-mast-pic"><img src={art.tbs.src} alt="Taking Back Sunday live in 2007" onError={e=>e.currentTarget.style.display="none"}/></div>
  <div className="ap-mast-type"><small>SCENEINDEX</small><strong>THE ARCHIVE<br/>IS STILL ALIVE.</strong><span>2000s music / real forum history</span></div>
 </div>;
}
export function PortalAside({onArtist,onNavigate}){
 return <div className="ap-aside-top">
  <PortalBox name="Featured Band"><Picture photo={art.tbs}/><div className="ap-photo-credits"><a href={art.tbs.page} target="_blank" rel="noopener noreferrer">Photo: Debs (CC BY 2.0)</a></div><button className="ap-feature-name" onClick={()=>onArtist("Taking Back Sunday")}>Taking Back Sunday <ArrowRight size={12}/></button><div className="ap-feature-sub">Projekt Revolution · 2007</div><div className="ap-feature-buttons"><button onClick={()=>onArtist("Taking Back Sunday")}>PROFILE</button><button onClick={()=>onNavigate("discover")}>DISCOVER</button></div></PortalBox>
  <PortalBox name="Artist Spotlight"><Picture photo={art.saosin}/><div className="ap-photo-credits"><a href={art.saosin.page} target="_blank" rel="noopener noreferrer">Photo: 2007 · Wikimedia Commons</a></div><button className="ap-feature-name" onClick={()=>onArtist("Saosin")}>Saosin <ArrowRight size={12}/></button><div className="ap-feature-sub">Debut album discussion · 2006</div></PortalBox>
 </div>
}
export default function PortalHome({threads,onOpen,onNavigate,onArtist}){
 const latest=[...threads].sort((a,b)=>b.date.localeCompare(a.date));
 const picks=latest.filter(t=>/(saosin|post.hardcore|emo|album|recommend)/i.test(t.title+" "+(t.tags||[]).join(" "))).slice(0,3);
 const more=latest.filter(t=>!picks.some(p=>p.id===t.id));
 const render=(list)=>list.map(t=><article className="ap-story" key={t.id}>
  <button className="ap-story-title" onClick={()=>onOpen(t.id)}><span className="ap-story-icon"><MessageSquare size={13}/></span>{t.title}</button>
  <p>{(t.posts?.[0]?.text||"").slice(0,235)}{(t.posts?.[0]?.text||"").length>235?"…":""}</p>
  <div className="ap-story-meta">by <b>{t.posts?.[0]?.author||"Unknown"}</b> on {t.date} <span>·</span> {t.source} <button onClick={()=>onOpen(t.id)}>{t.posts?.length||0} indexed {t.posts?.length===1?"post":"posts"} <MessageSquare size={11}/></button></div>
 </article>);
 return <div className="ap-home">
  <div className="ap-home-intro"><span><b>⌂</b> SceneIndex.net</span><span>Welcome to the old music internet. <button onClick={()=>onNavigate("import")}>Contribute an archive <ArrowRight size={11}/></button></span></div>
  <div className="ap-home-grid">
   <div className="ap-left">
    <PortalBox name="Fireworks"><Picture photo={art.saosin}/><div className="ap-photo-credits"><a href={art.saosin.page} target="_blank" rel="noopener noreferrer">Live photo · 2007 / Commons</a></div><div className="ap-spotlight-name"><button onClick={()=>onArtist("Saosin")}>Saosin</button><small>Project Revolution, 2007</small></div><div className="ap-tiny-actions"><button onClick={()=>onArtist("Saosin")}><Music2 size={13}/> MUSIC</button><button onClick={()=>onNavigate("discover")}><Star size={13}/> FIND</button></div></PortalBox>
    <PortalBox name="Scene Exclusives"><div className="ap-exclusives">{[["The Medic Droid","2008 recommendation"],["Cute Is What We Aim For","2008 scene discussion"],["I Am Ghost","2006 album favorites"],["Chiodos","Post-hardcore favorites"]].map(([a,sub])=><button onClick={()=>onArtist(a)} key={a}><span className="ap-letter">{a.slice(0,1)}</span><span><strong>{a}</strong><small>{sub}</small></span></button>)}</div></PortalBox>
    <PortalBox name="Archive Tools"><div className="ap-side-links"><button onClick={()=>onNavigate("import")}>Import old forum threads</button><button onClick={()=>onNavigate("search")}>Search all discussions</button><button onClick={()=>onNavigate("sources")}>Original forum sources</button></div></PortalBox>
   </div>
   <div className="ap-center">
    <PortalBox name="★ Staff Picks / Music Discovery" right={<button className="ap-head-action" onClick={()=>onNavigate("discover")}>Discovery Engine »</button>}>
      <div className="ap-staff-picks"><strong>Old forum recommendations, new discoveries.</strong><p>Find the bands that actual forum members suggested to listeners with similar tastes. Every suggestion includes its source thread.</p><button onClick={()=>onNavigate("discover")}>Explore recommendations &raquo;</button></div>
    </PortalBox>
    <PortalBox name="Featured Forum Discussions" right={<button className="ap-head-action" onClick={()=>onNavigate("search")}>More threads »</button>}>{render(picks)}</PortalBox>
    <PortalBox name="From The Archives / 2006–2009" right={<button className="ap-head-action" onClick={()=>onNavigate("search")}>Search all »</button>}>{render(more)}</PortalBox>
    <div className="ap-bottom-note">Posts are source-linked summaries, not fabricated old-forum messages. <button onClick={()=>onNavigate("sources")}>View original sources</button></div>
   </div>
  </div>
 </div>
}
