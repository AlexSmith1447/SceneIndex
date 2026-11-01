import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,Disc3,Archive,Upload,Heart,Bookmark,MessageSquare,ArrowRight,ChevronRight,ChevronLeft,ExternalLink,Music2,Users,FolderOpen,FileText,Filter,SlidersHorizontal,Plus,Trash2,Download,CheckCircle,AlertTriangle,Info,Link2,Share2,Database,CalendarDays,RefreshCw,Headphones,FileUp,Menu,X,Star,BarChart3,ShieldCheck} from "lucide-react";
import {starterThreads,artistCatalog,archives} from "./catalog.js";
import PortalHome,{PortalAside,PortalHeaderArt} from "./PortalHome.jsx";
import RemoteImport from "./RemoteImport.jsx";
import ArchivePackages from "./ArchivePackages.jsx";
import CommunityDirectory from "./CommunityDirectory.jsx";
import {searchThreads,bestSnippet,findArtists,threadArtists,buildGraph,discover,similarAuthors,stats,normalize,configureExtraArtists} from "./engine.js";
import {loadThreads,saveThread,deleteThread,readPref,writePref,exportArchive} from "./storage.js";
import {parseHTML,parseJSON,parseManual,parseArtistCSV} from "./importers.js";
import "./styles.css";
import "./portal2009.css";
import "./authentic2009.css";
import "./forumRefinement.css";
import "./communityDirectory.css";

const categories=["All Boards","Music Discussion","Recommendations","Hardcore / Screamo","Pop Punk / Emo","Scene / Electronic","Imported discussions"];
const colorFor=(name)=>["#507e90","#947a72","#6d7c98","#8d7964","#607a70","#957e91"][Array.from(name).reduce((n,c)=>n+c.charCodeAt(0),0)%6];
function Badge({children,tone=""}){return <span className={"si-badge "+tone}>{children}</span>}
function Frame({children}){return <div className="si-frame">{children}</div>}
function Pane({label,icon:Icon,children,extra}){return <section className="si-pane"><div className="si-pane-head"><strong>{Icon&&<Icon size={14}/>} {label}</strong>{extra}</div>{children}</section>}
function Stamp({children}){return <span className="si-stamp">{children}</span>}
function PersonAvatar({name}){return <span className="si-avatar" style={{background:colorFor(name)}}>{(name||"?").slice(0,1).toUpperCase()}</span>}
function PageTrail({items,onHome}){return <div className="si-trail"><button onClick={onHome}>SceneIndex</button>{items.map((item,i)=><React.Fragment key={i}><ChevronRight size={12}/><span>{item}</span></React.Fragment>)}</div>}
function ThreadRow({thread,onOpen,compact=false,matchQuery=""}){
 const authors=[...new Set((thread.posts||[]).map(p=>p.author))];
 const snippet=matchQuery?bestSnippet(thread,matchQuery):{text:thread.posts?.[0]?.text||"No preview available.",author:thread.posts?.[0]?.author||"Unknown"};
 return <button className={"si-thread-row"+(compact?" compact":"")} onClick={()=>onOpen(thread.id)}>
  <span className="si-thread-icon"><MessageSquare size={18}/></span>
  <span className="si-thread-details"><strong>{thread.title}</strong><small>{thread.source} <b>·</b> {thread.board} <b>·</b> {thread.dateBasis==="unknown"?"date unverified":thread.dateBasis==="capture"?"captured "+thread.date:thread.date}</small><span className="si-thread-excerpt">{matchQuery&&<b className="si-match-label">MATCH · {snippet.author}</b>} {snippet.text}</span></span>
  <span className="si-thread-meta"><strong>{thread.posts?.length||0}</strong><small>{(thread.posts?.length||0)===1?"post":"posts"}</small><span>{authors.length} {authors.length===1?"user":"users"}</span></span>
  <ChevronRight className="si-thread-arrow" size={17}/>
 </button>;
}
function UserBox({user,onArtist}){
 return <div className="si-member-box"><PersonAvatar name={user.name}/><div><strong>{user.name}</strong><small>{user.source}</small></div><span><b>{user.matchCount}</b> shared artists</span><div className="si-member-interests">{user.overlap.map(a=><button onClick={()=>onArtist(a)} key={a}>{a}</button>)}</div></div>;
}
function ThreadPage({thread,onBack,onArtist,onSave,saved}){
 const artists=threadArtists(thread);
 const share=async()=>{const url=new URL(location.href);url.searchParams.set("thread",thread.id);try{await navigator.clipboard.writeText(url.toString())}catch{}};
 return <div><PageTrail items={[thread.source,thread.board,thread.title]} onHome={onBack}/>
  <div className="si-section-title"><div><h1>{thread.title}</h1><p>{thread.source} · {thread.board} · {thread.dateBasis==="unknown"?"original date unknown":thread.dateBasis==="capture"?"archived "+thread.date:"started "+thread.date}</p></div><div className="si-inline-actions"><button onClick={()=>onSave(thread.id)}><Bookmark size={14} fill={saved?"currentColor":"none"}/>{saved?"Saved":"Save"}</button><button onClick={share}><Share2 size={14}/> Copy link</button></div></div>
  <div className="si-notice"><ShieldCheck size={17}/><span>{thread.origin==="verified-paraphrase"?"This discussion is sourced from a real forum. Messages here are clearly labeled paraphrases, not verbatim archival copies.": "User-imported material; SceneIndex has not independently verified the author's identity or the source text."} {thread.sourceUrl&&<a href={thread.sourceUrl} target="_blank" rel="noopener noreferrer">Original source <ExternalLink size={12}/></a>} {thread.dateBasis==="capture"&&<strong>Dates are capture dates, not verified original post dates.</strong>}{thread.dateBasis==="unknown"&&<strong>The original posting date could not be extracted; no date is being asserted.</strong>}</span></div>
  <div className="si-posts">{thread.posts.map((p,i)=><article className="si-post" key={p.id||i} id={"post-"+i}><aside className="si-post-user"><PersonAvatar name={p.author}/><strong>{p.author}</strong><small>{p.role||"Member"}</small><span>{thread.source}</span></aside><div className="si-post-body"><header><span>{thread.dateBasis==="unknown"&&!p.date?"Original date unverified":thread.dateBasis==="capture"&&!p.date?"Original date unknown · archived "+thread.date:"Posted: "+(p.date||thread.date)}</span><a href={"#post-"+i}>#{i+1}</a></header><p>{p.text}</p><div className="si-post-tail"><Badge tone={p.kind==="recommendation"?"mint":p.kind==="request"?"orange":""}>{p.kind||"discussion"}</Badge>{p.origin==="paraphrase"&&<small>Summarized from the original thread</small>}</div></div></article>)}</div>
  {artists.length>0&&<Pane label="ARTISTS MENTIONED IN THIS THREAD" icon={Music2}><div className="si-mentioned">{artists.map(a=><button key={a} onClick={()=>onArtist(a)}><Disc3 size={13}/>{a}<ChevronRight size={12}/></button>)}</div></Pane>}
  <div className="si-bottom-nav"><button onClick={onBack}><ChevronLeft size={14}/> Back to forum</button>{thread.sourceUrl&&<a href={thread.sourceUrl} target="_blank" rel="noopener noreferrer">Read original discussion <ExternalLink size={13}/></a>}</div>
 </div>;
}
function SearchPage({threads,onOpen,onArtist,initialQuery="",initialYear="all"}){
 const [q,setQ]=useState(initialQuery),[source,setSource]=useState("all"),[year,setYear]=useState(initialYear),[tag,setTag]=useState("all"),[sort,setSort]=useState("relevance");
 useEffect(()=>setQ(initialQuery),[initialQuery]);
 useEffect(()=>setYear(initialYear),[initialYear]);
 const sources=[...new Set(threads.map(t=>t.source))].sort(),years=[...new Set(threads.map(t=>t.year).filter(y=>Number(y)>=1900))].sort((a,b)=>b-a),tags=[...new Set(threads.flatMap(t=>t.tags||[]))].sort();
 const results=useMemo(()=>searchThreads(threads,{q,source,year,tag,sort}),[threads,q,source,year,tag,sort]);
 return <div><PageTrail items={["Forum search"]}/><div className="si-section-title"><div><h1>Search the archives</h1><p>Search thread titles, posts, usernames and recognized artists.</p></div></div>
  <Pane label="FIND DISCUSSIONS" icon={Search}><div className="si-search-panel">
    <div className="si-wide-search"><Search size={17}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder={'Try "The Medic Droid" -metalcore or Saosin…'} aria-label="Search archive"/></div>
    <div className="si-filters"><label>Source<select value={source} onChange={e=>setSource(e.target.value)}><option value="all">All sources</option>{sources.map(s=><option key={s}>{s}</option>)}</select></label><label>Year<select value={year} onChange={e=>setYear(e.target.value)}><option value="all">Any year</option>{years.map(y=><option key={y}>{y}</option>)}</select></label><label>Tag<select value={tag} onChange={e=>setTag(e.target.value)}><option value="all">Any tag</option>{tags.map(t=><option key={t}>{t}</option>)}</select></label><label>Order<select value={sort} onChange={e=>setSort(e.target.value)}><option value="relevance">Relevance</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
  <div className="si-search-help">Use <code>"quoted phrases"</code> for exact matches, <code>-excluded</code> to remove a term, or combine artist and genre keywords. Results prioritize matching replies and source discussions.</div>
  </div></Pane>
  <div className="si-results-head"><strong>{results.length} matching {results.length===1?"thread":"threads"}</strong><span>Searches imported and sourced records only</span></div>
  <div className="si-thread-table">{results.map(t=><ThreadRow key={t.id} thread={t} onOpen={onOpen} matchQuery={q}/>)}</div>
  {!results.length&&<div className="si-empty"><Search size={30}/><strong>No matching threads</strong><p>Try fewer filters or import more forum discussions.</p></div>}
 </div>;
}
function DiscoverPage({threads,artists,onArtist,onOpen,onAddArtist,onRemoveArtist}){
 const [add,setAdd]=useState("");
 const [era,setEra]=useState("all");
 const years=useMemo(()=>[...new Set(threads.map(t=>t.year))].sort((a,b)=>a-b),[threads]);
 const eraThreads=useMemo(()=>era==="all"?threads:threads.filter(t=>String(t.year)===era),[threads,era]);
 const recommendations=useMemo(()=>discover(eraThreads,artists),[eraThreads,artists]);
 const people=useMemo(()=>similarAuthors(eraThreads,artists),[eraThreads,artists]);
 const submit=e=>{e.preventDefault();if(add.trim())onAddArtist(add.trim());setAdd("")};
 return <div><PageTrail items={["Discovery engine"]}/><div className="si-section-title"><div><h1>Music discovery lab</h1><p>Forum recommendations, shared tastes and connections. Every result links to evidence.</p></div><Badge tone="mint">ENGINE v0.1</Badge></div>
  <Pane label="YOUR MUSIC TASTE" icon={Headphones}><div className="si-taste"><p>Choose artists you like, or import a Last.fm CSV. Adding an artist also teaches the local index to recognize its name in imported conversations. Source-linked relationships, not genre guesses, influence results.</p><div className="si-taste-tags">{artists.map(a=><button key={a} onClick={()=>onRemoveArtist(a)} title={"Remove "+a}>{a} <X size={12}/></button>)}</div><form onSubmit={submit}><input value={add} onChange={e=>setAdd(e.target.value)} placeholder="Add an artist you listen to…" aria-label="Add favorite artist"/><button className="si-button primary"><Plus size={14}/> Add artist</button></form><div className="si-suggested">Try an evidence-backed example: <button onClick={()=>onAddArtist("Sky Eats Airplane")}>Sky Eats Airplane</button><button onClick={()=>onAddArtist("Breathe Carolina")}>Breathe Carolina</button></div></div></Pane>
  <div className="si-era-filter"><label htmlFor="si-era-select">DISCOVERY ERA</label><select id="si-era-select" value={era} onChange={e=>setEra(e.target.value)}><option value="all">All indexed years</option>{years.map(y=><option key={y} value={String(y)}>{y} only</option>)}</select><span>Results use original discussion dates, not album release years.</span></div>
  <div className="si-section-small"><strong><Disc3 size={16}/> Music you might have missed</strong><span>{recommendations.length} supported suggestions</span></div>
  <div className="si-recommendation-list">{recommendations.map((r,i)=><div className="si-rec" key={r.name}><span className="si-rec-rank">{String(i+1).padStart(2,"0")}</span><div><button className="si-rec-title" onClick={()=>onArtist(r.name)}>{r.name} <ArrowRight size={14}/></button><p>Related to {r.matchedWith.join(", ")}</p><small>{r.explicitCount||0} direct recommendation {(r.explicitCount||0)===1?"entry":"entries"} · {r.evidence.length} total source-linked relationships</small>
   {!(r.explicitCount>0)&&<span className="si-context-only">Context similarity only — not an explicit recommendation</span>}<div className="si-evidence">{r.evidence.slice(0,3).map((ev,j)=><button key={j} onClick={()=>onOpen(ev.threadId)}><MessageSquare size={12}/>{ev.thread} · {ev.author||"forum member"} <ChevronRight size={12}/></button>)}</div></div><span className="si-rec-weight">{r.score.toFixed(1)}<small>evidence score</small></span></div>)}</div>
  {!recommendations.length&&<div className="si-empty"><Disc3 size={30}/><strong>Not enough overlapping evidence yet</strong><p>Import more conversations containing your favorite artists, or try the example tags above. SceneIndex won't invent recommendations to fill the list.</p></div>}
  <div className="si-section-small"><strong><Users size={16}/> Forum members with overlapping taste</strong></div>
  <div className="si-member-grid">{people.map(u=><UserBox key={u.id} user={u} onArtist={onArtist}/>)}</div>
  {!people.length&&<div className="si-empty mini">No indexed forum members currently overlap with your selected artists.</div>}
 </div>;
}
function SourcesPage({threads,onOpen}){
 const sources=[...new Set(threads.map(t=>t.source))];
 return <div><PageTrail items={["Sources"]}/><div className="si-section-title"><div><h1>Forum directory</h1><p>A growing index of original forums and conversations.</p></div></div>
 {archives.map(source=>{
  const all=threads.filter(t=>t.source===source.name);
  return <Pane key={source.name} label={source.name.toUpperCase()} icon={FolderOpen} extra={<a className="si-link" href={source.link} target="_blank" rel="noopener noreferrer">Source <ExternalLink size={12}/></a>}><div className="si-source-body"><div><p>{source.description}</p><small>{source.era} · {source.status}</small></div><Badge>{all.length} indexed</Badge></div>{all.slice(0,8).map(t=><ThreadRow key={t.id} thread={t} onOpen={onOpen} compact/>)}</Pane>
 })}
 {sources.filter(s=>!archives.some(a=>a.name===s)).map(s=><Pane key={s} label={s.toUpperCase()} icon={Archive}><div className="si-source-body"><p>User-imported collection</p><Badge>{threads.filter(t=>t.source===s).length} indexed</Badge></div>{threads.filter(t=>t.source===s).map(t=><ThreadRow key={t.id} thread={t} onOpen={onOpen} compact/>)}</Pane>)}
 </div>;
}
function ImportPage({threads,onImported,onDelete,onOpen,onTasteImport,onExport}){
 const [kind,setKind]=useState("html"),[source,setSource]=useState("Personal import"),[url,setUrl]=useState(""),[title,setTitle]=useState(""),[date,setDate]=useState("2008-01-01"),[board,setBoard]=useState("Music Discussion"),[text,setText]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const imported=threads.filter(t=>t.origin==="user-import");
 async function fileChanged(e){
  const file=e.target.files?.[0];if(!file)return;setBusy(true);setNotice("");
  try{
   if(file.size>7_000_000)throw Error("This file is too large (7 MB maximum).");
   const raw=await file.text();
   if(kind==="csv"){const {parseArtistCSV}=await import("./importers.js");const names=parseArtistCSV(raw);onTasteImport(names);setNotice("Imported "+names.length+" unique artists into your taste profile.");return}
   const result=kind==="json"?parseJSON(raw):parseHTML(raw,{source,sourceUrl:url,title});
   for(const t of result)await onImported(t);
   setNotice("Imported "+result.length+" thread"+(result.length===1?"":"s")+" successfully.");
  }catch(err){setNotice("Import error: "+err.message)}finally{setBusy(false);e.target.value=""}
 }
 async function manualSubmit(e){
  e.preventDefault();setNotice("");setBusy(true);
  try{for(const thread of parseManual({title,source,sourceUrl:url,board,raw:text,date}))await onImported(thread);setNotice("Thread added to the local archive.");setText("")}
  catch(e){setNotice("Import error: "+e.message)}finally{setBusy(false)}
 }
 return <div><PageTrail items={["Import desk"]}/><div className="si-section-title"><div><h1>The import desk</h1><p>Find downloadable collections, import preserved forum dumps, or index individual threads.</p></div><Badge tone="orange">LOCAL ARCHIVE</Badge></div>
  <div className="si-notice"><Info size={17}/><span>Imports are saved in this browser's IndexedDB. They are not uploaded to a server or automatically shared. Only import content you have permission to preserve, and keep original source links when possible.</span></div>
  <ArchivePackages onImported={onImported}/>
  <RemoteImport onImported={onImported} existing={threads}/>
  <Pane label="CHOOSE IMPORT METHOD" icon={FileUp}><div className="si-import-tabs">{[["html","Saved forum HTML"],["json","SceneIndex JSON"],["manual","Paste a thread"],["csv","Last.fm CSV"]].map(([k,label])=><button className={kind===k?"active":""} key={k} onClick={()=>{setKind(k);setNotice("")}}>{label}</button>)}</div>
   <div className="si-import-fields">
    {kind!=="csv"&&kind!=="json"&&<><label>Original forum name<input value={source} onChange={e=>setSource(e.target.value)} placeholder="e.g. LP Association Forums"/></label><label>Original URL (optional)<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://forum.example.com/thread/..."/></label></>}
    {kind==="html"&&<><label>Thread title override (optional)<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Leave empty to detect from HTML"/></label><p>Upload a saved HTML page from XenForo, vBulletin, phpBB or Invision. The parser extracts recognizable posts, usernames and dates, and marks everything as user-imported.</p></>}
    {kind==="json"&&<p>Import a previous SceneIndex export or a JSON object containing a thread title and an array of posts.</p>}
    {kind==="csv"&&<p>Import an Artist-column CSV or a Last.fm scrobble export. This updates your local taste profile, not your forum archive.</p>}
    {kind!=="manual"&&<label className="si-file-drop"><Upload size={22}/><strong>{busy?"Importing…":"Choose a "+(kind==="html"?"saved forum HTML file":kind==="json"?"JSON archive":"CSV file")}</strong><span>Local file · nothing uploaded to the server</span><input type="file" accept={kind==="html"?".html,.htm,text/html":kind==="json"?".json,application/json":".csv,.tsv,text/csv,text/tab-separated-values"} onChange={fileChanged} disabled={busy}/></label>}
    {kind==="manual"&&<form onSubmit={manualSubmit} className="si-manual-form"><div className="si-two-fields"><label>Thread title<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="What are some good bands?"/></label><label>Original date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div><label>Forum section<input value={board} onChange={e=>setBoard(e.target.value)}/></label><label>Messages<textarea required rows={9} value={text} onChange={e=>setText(e.target.value)} placeholder={"Daniel: Looking for music similar to...\n\n---\n\nOtherMember: Check out..."}/></label><p>Use <code>Author: message</code> and separate replies with a line containing <code>---</code>.</p><button className="si-button primary" disabled={busy}><Plus size={14}/> Import discussion</button></form>}
    {notice&&<div className={"si-import-notice"+(notice.startsWith("Import error")?" error":"")}>{notice}</div>}
   </div>
  </Pane>
  <Pane label={"YOUR LOCAL IMPORTS ("+imported.length+")"} icon={Archive} extra={<button onClick={onExport} className="si-text-button"><Download size={13}/> Export JSON</button>}>
   {imported.length?imported.map(t=><div className="si-import-row" key={t.id}><button onClick={()=>onOpen(t.id)}><strong>{t.title}</strong><small>{t.source} · {t.posts.length} posts</small></button><button className="si-icon-button" onClick={()=>{if(confirm("Delete this locally imported thread?"))onDelete(t.id)}} title="Remove imported thread"><Trash2 size={15}/></button></div>):<div className="si-empty mini">No personal imports yet. The starter source threads remain searchable.</div>}
  </Pane>
 </div>;
}
function HomePage({threads,onOpen,onNavigate,onArtist,saved}){
 const t=threads.slice().sort((a,b)=>b.date.localeCompare(a.date));
 return <div><PageTrail items={["Board index"]}/><div className="si-welcome"><div><div className="si-eyebrow">SCENE INDEX // ARCHIVE NETWORK</div><h1>Where the old forums<br/><em>still have something to say.</em></h1><p>Search real music conversations, follow the recommendations, and rediscover bands lost between MySpace and the present.</p><button className="si-button primary" onClick={()=>onNavigate("discover")}><Disc3 size={16}/> Find me music <ArrowRight size={14}/></button></div><div className="si-welcome-disc"><Disc3 size={92}/><span>EST. IN THE ARCHIVES</span></div></div>
  <div className="si-summary">{Object.entries(stats(threads)).map(([k,v])=><div key={k}><strong>{v}</strong><small>{k}</small></div>)}</div>
  <Pane label="LATEST INDEXED DISCUSSIONS" icon={MessageSquare} extra={<button className="si-text-button" onClick={()=>onNavigate("search")}>Advanced search <ChevronRight size={12}/></button>}>
   <div className="si-thread-table">{t.slice(0,12).map(thread=><ThreadRow thread={thread} key={thread.id} onOpen={onOpen}/>)}</div>
   {t.length===0&&<div className="si-empty">No threads indexed yet.</div>}
  </Pane>
  <div className="si-two-panes"><Pane label="EXPLORE CONNECTIONS" icon={Music2}><div className="si-feature-panel"><h3>Who recommended what?</h3><p>Trace scene music recommendations back to original discussions instead of relying only on genre tags.</p><button className="si-small-button" onClick={()=>onNavigate("discover")}>Open discovery engine <ArrowRight size={13}/></button></div></Pane><Pane label="GROW THE ARCHIVE" icon={Archive}><div className="si-feature-panel"><h3>Bring the forums back</h3><p>Import saved forum pages, a thread export, or your own collection of discussions.</p><button className="si-small-button" onClick={()=>onNavigate("import")}>Import discussions <ArrowRight size={13}/></button></div></Pane></div>
 </div>;
}
function ArtistPage({artist,threads,onBack,onOpen,onAddArtist,onFind}){
 const results=searchThreads(threads,{q:artist});
 return <div><PageTrail onHome={onBack} items={["Artists",artist]}/><div className="si-artist-banner"><Disc3 size={50}/><div><span>ARTIST INDEX</span><h1>{artist}</h1><p>Forum mentions and relationships linked to surviving source threads.</p></div><button className="si-button primary" onClick={()=>onAddArtist(artist)}><Heart size={14}/> Add to taste</button></div>
 <Pane label="THREADS THAT MENTION THIS ARTIST" icon={MessageSquare}>{results.length?results.map(t=><ThreadRow key={t.id} thread={t} onOpen={onOpen} compact/>):<div className="si-empty mini">No imported conversations mention this artist yet.</div>}</Pane><button className="si-small-button" onClick={()=>onFind(artist)}>Search full archive <Search size={14}/></button></div>;
}
function App(){
 const [threads,setThreads]=useState(starterThreads),[loading,setLoading]=useState(true);
 const [page,setPage]=useState("home"),[activeThread,setActiveThread]=useState(null),[artist,setArtist]=useState(""),[searchTerm,setSearchTerm]=useState(""),[searchYear,setSearchYear]=useState("all");
 const [sourceScene,setSourceScene]=useState("all"),[sourceForum,setSourceForum]=useState(null);
 const [topSearch,setTopSearch]=useState(""),[favorites,setFavorites]=useState(()=>{const artists=readPref("favorites",[]);configureExtraArtists(artists);return artists});
 const [saved,setSaved]=useState(()=>readPref("saved",[])),[menu,setMenu]=useState(false),[lastfm,setLastfm]=useState(()=>readPref("lastfm",""));
 const [fmBusy,setFmBusy]=useState(false),[fmStatus,setFmStatus]=useState("");
 const [classicWidth,setClassicWidth]=useState(()=>readPref("classicWidth",false));
 useEffect(()=>{loadThreads().then(t=>setThreads(t)).finally(()=>setLoading(false))},[]);
 useEffect(()=>writePref("favorites",favorites),[favorites]);
 useEffect(()=>writePref("saved",saved),[saved]);
 useEffect(()=>writePref("lastfm",lastfm),[lastfm]);
 useEffect(()=>writePref("classicWidth",classicWidth),[classicWidth]);
 const navigate=p=>{setPage(p);if(p==="search")setSearchYear("all");setMenu(false);window.scrollTo(0,0);history.replaceState({},"",location.pathname)};
 const openYear=year=>{navigate("search");setSearchYear(String(year));setSearchTerm("");setTopSearch("")};
 const openScene=id=>{setSourceScene(id);setSourceForum(null);navigate("sources")};
 const openCommunity=id=>{setSourceScene("all");setSourceForum(id);navigate("sources")};
 const openThread=id=>{setActiveThread(id);setPage("thread");setMenu(false);window.scrollTo(0,0);history.replaceState({},"","?thread="+encodeURIComponent(id))};
 useEffect(()=>{if(!loading){const id=new URLSearchParams(location.search).get("thread");if(id&&threads.some(t=>t.id===id)){setActiveThread(id);setPage("thread")}}},[loading]);
 const openArtist=a=>{setArtist(a);navigate("artist")};
 const runSearch=e=>{e.preventDefault();setSearchTerm(topSearch.trim());navigate("search")};
 const addArtist=a=>setFavorites(old=>{const next=old.some(x=>normalize(x)===normalize(a))?old:[...old,a].slice(0,500);configureExtraArtists(next);return next});
 const removeArtist=a=>setFavorites(old=>{const next=old.filter(x=>normalize(x)!==normalize(a));configureExtraArtists(next);return next});
 const imported=async t=>{await saveThread(t);setThreads(old=>[...old.filter(x=>x.id!==t.id),t]);};
 const remove=async id=>{await deleteThread(id);setThreads(old=>old.filter(t=>t.id!==id))};
 const exportData=()=>{const blob=exportArchive(threads),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="SceneIndex-archive.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const csvAdded=artists=>{setFavorites(old=>{const next=[...new Set([...old,...artists])].slice(0,500);configureExtraArtists(next);return next})};
 async function fetchLastfm(e){
  e.preventDefault();if(!lastfm.trim())return;setFmStatus("");setFmBusy(true);
  try{const r=await fetch("/api/lastfm?"+new URLSearchParams({user:lastfm.trim(),mode:"top"}));const j=await r.json();if(!r.ok)throw Error(j.error||"Last.fm unavailable");csvAdded(j.artists.map(x=>x.name));setFmStatus("Added "+j.artists.length+" recent top artists to your local taste profile.")}
  catch(e){setFmStatus(e.message)}finally{setFmBusy(false)}
 }
 const onFind=a=>{setTopSearch(a);setSearchTerm(a);navigate("search")};
 const selectedThread=threads.find(t=>t.id===activeThread);
 const tagCounts=Object.entries(threads.flatMap(t=>t.tags||[]).reduce((acc,tag)=>{acc[tag]=(acc[tag]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,9);
 const items=[["home","Forums",MessageSquare],["sources","Communities",FolderOpen],["search","Search",Search],["discover","Discover",Disc3],["import","Import",Upload]];
 return <div data-site-build="forum-wide-20261101-v2" className={"si-app"+(classicWidth?" si-classic-width":"")}>
  <div className="si-top-accent"/>
  <header className="si-header"><div className="si-container si-header-inner"><button className="si-brand" onClick={()=>navigate("home")}><span className="si-brand-icon">S<span>/</span>I</span><span><strong>SCENE<span>INDEX</span></strong><small>the scene music archive</small></span></button><PortalHeaderArt/></div></header>
  <div className="si-nav"><div className="si-container si-nav-inner"><button className="si-mobile-toggle" onClick={()=>setMenu(!menu)}><Menu size={17}/> Menu</button><nav className={menu?"open":""}>{items.map(([id,label,Icon])=><button key={id} className={page===id?"active":""} onClick={()=>navigate(id)}><Icon size={14}/>{label}</button>)}</nav><form onSubmit={runSearch} className="si-header-search"><Search size={14}/><input value={topSearch} onChange={e=>setTopSearch(e.target.value)} placeholder="Search bands, threads, people..." aria-label="Global search"/><button aria-label="Submit search"><ArrowRight size={14}/></button></form><button className="si-width-choice" onClick={()=>setClassicWidth(!classicWidth)} title={classicWidth?"Expand the forum layout":"View at the original fixed-width proportions"}>{classicWidth?"Wide layout":"Classic width"}</button></div></div>
  <div className="si-container si-grid">
   <main className="si-main">{loading?<div className="si-empty">Opening your local archive...</div>:
    page==="home"?<PortalHome threads={threads} onOpen={openThread} onNavigate={navigate} onArtist={openArtist} onYear={openYear} onScene={openScene} onCommunity={openCommunity}/>:
    page==="search"?<SearchPage threads={threads} initialQuery={searchTerm} initialYear={searchYear} onOpen={openThread} onArtist={openArtist}/>:
    page==="thread"?selectedThread?<ThreadPage thread={selectedThread} onBack={()=>navigate("home")} onArtist={openArtist} onSave={id=>setSaved(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])} saved={saved.includes(selectedThread.id)}/>:<div className="si-empty">Thread not found.</div>:
    page==="discover"?<DiscoverPage threads={threads} artists={favorites} onArtist={openArtist} onOpen={openThread} onAddArtist={addArtist} onRemoveArtist={removeArtist}/>:
    page==="sources"?<CommunityDirectory threads={threads} onOpen={openThread} onNavigate={navigate} initialScene={sourceScene} initialForum={sourceForum}/>:
    page==="import"?<ImportPage threads={threads} onImported={imported} onDelete={remove} onOpen={openThread} onTasteImport={csvAdded} onExport={exportData}/>:
    page==="artist"?<ArtistPage artist={artist} threads={threads} onBack={()=>navigate("home")} onOpen={openThread} onAddArtist={addArtist} onFind={onFind}/>:
    page==="saved"?<div><PageTrail items={["Your saved threads"]}/><div className="si-section-title"><h1>Your saved threads</h1></div><Pane label="BOOKMARKS" icon={Bookmark}>{threads.filter(t=>saved.includes(t.id)).map(t=><ThreadRow key={t.id} thread={t} onOpen={openThread}/>)}</Pane></div>:null}
   </main>
   <aside className="si-sidebar">
    {page==="home"&&<PortalAside onArtist={openArtist} onNavigate={navigate} onOpen={openThread} threads={threads}/>}
    <Pane label="MY MUSIC" icon={Headphones}><div className="si-sidebar-content"><div className="si-sidebar-count">{favorites.length}<span>artists in your collection</span></div><button className="si-sidebar-link" onClick={()=>navigate("discover")}>Find music from my taste <ChevronRight size={13}/></button><details className="si-listening-details"><summary>Import Last.fm listening history</summary><form className="si-lastfm" onSubmit={fetchLastfm}><label>Last.fm username<input value={lastfm} onChange={e=>setLastfm(e.target.value)} placeholder="username" aria-label="Last.fm username"/></label><button disabled={fmBusy} className="si-button small"><RefreshCw size={13}/>{fmBusy?"Loading":"Load recent top artists"}</button>{fmStatus&&<p className="si-fm-status">{fmStatus}</p>}<small>Requires a private API key configured in Cloudflare. CSV import is also available.</small></form></details></div></Pane>
    <Pane label="ARCHIVE AT A GLANCE" icon={Database}><div className="si-sidebar-stats">{Object.entries(stats(threads)).map(([name,value])=><div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div></Pane>
    <Pane label="DISCUSSION TAGS" icon={Music2}><div className="si-sidebar-tags">{tagCounts.map(([tag,count])=><button key={tag} onClick={()=>onFind(tag)}>#{tag} <small>({count})</small></button>)}</div></Pane>
    <Pane label="BOOKMARKS" icon={Bookmark}><div className="si-sidebar-content"><p>{saved.length} saved {saved.length===1?"thread":"threads"}</p><button className="si-sidebar-link" onClick={()=>navigate("saved")}>View saved discussions <ChevronRight size={13}/></button></div></Pane>
    <div className="si-source-warning"><Info size={14}/><span>Public records contain summaries and locally imported threads. Inspect original sources before treating an old recommendation as evidence.</span></div>
   </aside>
  </div>
  <footer className="si-footer"><div className="si-container"><span><b>SCENEINDEX</b> · A search engine for the old music internet</span><span>Independent preservation project · Original forum sources credited</span></div></footer>
 </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
