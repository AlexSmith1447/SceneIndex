import {normalize} from "./engine.js";

const clamp=(s,n)=>String(s??"").trim().slice(0,n);
const validURL=str=>{try{let u=new URL(str);return /^https?:$/.test(u.protocol)?u.href:""}catch{return ""}};
const dateish=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d))?d:"";
const slug=s=>normalize(s).replace(/ /g,"-").slice(0,65);
const generatedId=()=>typeof crypto?.randomUUID==="function"?crypto.randomUUID():""+Date.now()+"-"+Math.random().toString(36).slice(2,10);
const postKind=text=>/\b(recommend|suggest|check out|try listening|you might like)\b/i.test(text)?"recommendation":/\b(looking for|any recommendations|similar to|what bands)\b/i.test(text)?"request":"discussion";
function validate(raw){
  const obj=raw&&typeof raw==="object"?raw:{};
  const title=clamp(obj.title,200);
  const source=clamp(obj.source||"Personal import",100);
  const url=validURL(obj.sourceUrl);
  const date=dateish(obj.date)||new Date().toISOString().slice(0,10);
  if(!title)throw new Error("A thread title is required.");
  const p=Array.isArray(obj.posts)?obj.posts:[];
  if(!p.length)throw new Error("No posts were detected.");
  return {id:"import-"+generatedId(),title,source,sourceUrl:url,board:clamp(obj.board||"Imported discussions",100),
    date,year:Number(date.slice(0,4)),origin:"user-import",excerptOnly:!!obj.excerptOnly,
    tags:(Array.isArray(obj.tags)?obj.tags:[]).map(x=>slug(x)).filter(Boolean).slice(0,15),
    posts:p.slice(0,250).map((post,i)=>({
      id:"p-"+(i+1),author:clamp(post.author||"Unknown",70),date:dateish(post.date)||date,role:clamp(post.role||"Member",70),
      text:clamp(post.text,12000),kind:["discussion","request","recommendation"].includes(post.kind)?post.kind:postKind(post.text||""),
      origin:"user-import",excluded:Array.isArray(post.excluded)?post.excluded.slice(0,20):[]
    })).filter(p=>p.text.length>=3)
  };
}
export function parseJSON(text){
  let data;try{data=JSON.parse(text)}catch{throw new Error("Invalid JSON file.")}
  const candidate=data?.format==="sceneindex-v1"?data.threads:Array.isArray(data)?data:[data];
  if(!Array.isArray(candidate)||candidate.length>500)throw new Error("Expected a thread, an array of threads, or a SceneIndex export with at most 500 entries.");
  return candidate.map(validate);
}
const text=(root,selector)=>{const e=root.querySelector(selector);return (e?.textContent||"").replace(/\s+/g," ").trim()};
const human=(e)=>e?.textContent?.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim()||"";
export function parseHTML(html,{source="Imported forum",sourceUrl="",title=""}={}){
  if(html.length>7_000_000)throw new Error("HTML file is too large (7 MB maximum).");
  const doc=new DOMParser().parseFromString(html,"text/html");
  // Supported first-pass selectors: XenForo, vBulletin, phpBB, Invision.
  const selectors=[".message[data-author]",".message--post",".postbit",".postbody",".post",".ipsComment",".cPost",".post_message"];
  let nodes=[];
  for(const s of selectors){const matches=[...doc.querySelectorAll(s)];if(matches.length>=1){nodes=matches;break}}
  if(!nodes.length)throw new Error("No recognizable forum posts found. Try an HTML export from XenForo, vBulletin, phpBB or Invision, or use the manual importer.");
  const parsed=nodes.slice(0,250).map((node,i)=>{
    const author=node.getAttribute("data-author")||text(node,".username, .message-name, .message-name a, .poster .name, .postprofile dt a, .author a, .cAuthorPane_author, .ipsType_break");
    const content=node.querySelector(".message-content, .message-body, .bbWrapper, .content .message, .postcontent, .postentry, .postbody .content, .post_message, .ipsType_richText");
    const body=human(content||node);
    const dateRaw=node.querySelector("time")?.getAttribute("datetime")||node.querySelector("[data-time]")?.getAttribute("data-time")||"";
    const dateMatch=dateRaw.match(/\d{4}-\d{2}-\d{2}/);
    return {author:author||"Unknown",text:body,role:"Member",date:dateMatch?.[0],kind:postKind(body)};
  }).filter(p=>p.text.length>=3);
  const pageTitle=title||text(doc,"h1")||doc.title||"Imported thread";
  const firstDate=parsed.find(p=>p.date)?.date||new Date().toISOString().slice(0,10);
  if(!parsed.length)throw new Error("Post containers found, but no readable message text.");
  return [validate({title:pageTitle,source,sourceUrl,date:firstDate,board:"Imported discussions",posts:parsed})];
}
export function parseManual({title,source,sourceUrl,board,raw,date}){
  const parts=raw.split(/\n\s*---+\s*\n/).map(p=>p.trim()).filter(Boolean);
  const posts=parts.map(part=>{
    const m=part.match(/^([^:\n]{1,55}):\s*([\s\S]+)/);
    return {author:m?m[1].trim():"Unknown",text:m?m[2].trim():part};
  });
  return [validate({title,source,sourceUrl,board,date,posts})];
}
export function parseArtistCSV(text){
  // Supports quoted CSV and TSV; uses the Artist column if present.
  const first=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
  if(!first.length)throw Error("The file is empty.");
  const delimiter=first[0].includes("\t")?"\t":",";
  function row(line){
    const cells=[];let cell="",quoted=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'&&quoted&&line[i+1]==='"'){cell+='"';i++}
      else if(c==='"'){quoted=!quoted}
      else if(c===delimiter&&!quoted){cells.push(cell.trim());cell=""}
      else cell+=c;
    }
    cells.push(cell.trim());return cells;
  }
  const heads=row(first[0]).map(h=>normalize(h));
  let idx=heads.findIndex(h=>h==="artist"||h==="artist name"||h==="artistname");
  let offset=1;
  if(idx===-1){idx=0;offset=0}
  const names=first.slice(offset,10002).map(line=>row(line)[idx]).filter(Boolean);
  return [...new Set(names)].slice(0,500);
}
