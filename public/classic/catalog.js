// Seed catalogue: source-checked video IDs and publication years.
// A small fallback, NOT a historical YouTube index or reconstructed ranking.
export const seedVideos=[
 {id:"AdYaTa_lOf4",title:"Teddy Has An Operation",channel:"Ze Frank",year:2013,date:"2013-04-26",topic:"weird",tags:["surreal","strange","teddy","art"]},
 {id:"2yJgwwDcgV8",title:"Nyan Cat! [Official]",channel:"NyanCat",year:2011,date:"2011-04-12",topic:"animation",tags:["meme","internet","music","animation"]},
 {id:"CsGYh8AacgY",title:"Charlie the Unicorn",channel:"FilmCow",year:2008,date:"2008-01-10",topic:"animation",tags:["animation","unicorn","surreal","comedy"]},
 {id:"EwTZ2xpQwpA",title:"Chocolate Rain",channel:"Tay Zonday",year:2007,date:"2007-04-22",topic:"music",tags:["music","viral","internet"]},
 {id:"jNQXAC9IVRw",title:"Me at the zoo",channel:"jawed",year:2005,date:"2005-04-23",topic:"internet",tags:["history","first video","vlog"]},
 {id:"c4UMazLvKco",title:"BLOOPERS: How Animals Eat Their Food",channel:"MisterEpicMann2",year:2013,date:"2013-04-15",topic:"weird",tags:["comedy","animals","bloopers"]},
 {id:"MkE2lxkw00w",title:"SMOSH - ORIGINAL 2005 POKEMON THEME SONG (2010 reupload)",channel:"John",year:2010,date:"2010-11-29",topic:"gaming",tags:["smosh","pokemon","music","archive"],note:"2010 reupload; original 2005 video is unavailable at its old address."},
 {id:"WqSTXuJeTks",title:"Leave Britney Alone (Complete) — reupload",channel:"madringking1119",year:2011,date:"2011-08-11",topic:"internet",tags:["viral","classic","archive"],note:"2011 reupload; not an original 2007 upload."},
 {id:"hrzIykdka4s",title:"asdfmovie6",channel:"TomSka",year:2013,date:null,topic:"animation",tags:["asdfmovie","comedy","animation"]},
 {id:"27WufdasQYs",title:"My Wedding Speech",channel:"Tom Fletcher",year:2013,date:null,topic:"music",tags:["music","personal","wedding"]},
 {id:"4hpEnLtqUDg",title:"Harlem Shake (original army edition)",channel:"YouTube",year:2013,date:null,topic:"internet",tags:["viral","harlem shake","dance"]},
 {id:"ZwS14TiO7Pk",title:"Will Smith and DJ Jazzy Jeff on The Graham Norton Show",channel:"The Graham Norton Show",year:2013,date:null,topic:"music",tags:["comedy","dance","music"]},
 {id:"a4Fv98jttYA",title:"Attraction shadow theatre performance, BGT 2013",channel:"Britain's Got Talent",year:2013,date:null,topic:"weird",tags:["performance","shadow art"]},
 {id:"A6XUVjK9W4o",title:"People Are Awesome 2013 (Hadouken! – Levitate)",channel:"People Are Awesome",year:2013,date:null,topic:"internet",tags:["sports","compilation","music"]}
];
export const topics=[{id:"gaming",name:"Gaming",terms:["minecraft 2012 lets play","gmod 2012","slender game 2012","indie gaming 2013"]},{id:"animation",name:"Animation",terms:["youtube animation 2011","asdfmovie","2010 flash animation","classic animated shorts"]},{id:"music",name:"Music",terms:["myspace music 2008","2009 scene music","2011 acoustic cover","2000s music videos"]},{id:"internet",name:"Internet classics",terms:["youtube 2009 viral video","old internet videos 2011","2012 web culture","early youtube vlog"]},{id:"weird",name:"Oddities",terms:["strange youtube videos 2013","surreal stop motion","2010 surreal short film","weird vintage youtube"]}];
export const stableKey="classicYoutube13.v1";
export function isValidId(id){return /^[A-Za-z0-9_-]{11}$/.test(id||"")}
export function videoFromUrl(value){
 try{
  const url=new URL(value);
  if(!/^(www\.|m\.)?(youtube\.com|youtube-nocookie\.com)$/.test(url.hostname)&&url.hostname!=="youtu.be")return null;
  let id=url.hostname==="youtu.be"?url.pathname.slice(1).split("/")[0]:url.searchParams.get("v");
  if(!id&&/^\/(embed|shorts|live)\//.test(url.pathname))id=url.pathname.split("/")[2];
  return isValidId(id)?id:null
 }catch{return null}
}
export function isBefore(video,year){return Number(video.year)>0&&Number(video.year)<=Number(year)}
export function thumbnail(id){return "https://i.ytimg.com/vi/"+encodeURIComponent(id)+"/hqdefault.jpg"}
export function normalizeSearchItem(item){
 const id=item?.id?.videoId||item?.id;
 const s=item?.snippet;
 if(!isValidId(id)||!s?.publishedAt)return null;
 const year=new Date(s.publishedAt).getUTCFullYear();
 if(!Number.isFinite(year))return null;
 return {id,title:s.title||"Untitled",channel:s.channelTitle||"Unknown channel",channelId:s.channelId||"",year,date:s.publishedAt.slice(0,10),topic:"explore",tags:Array.isArray(item.snippet?.tags)?item.snippet.tags:[],description:item.snippet?.description||"",live:true,views:item.views??null,likes:item.likes??null,duration:item.duration||null};
}
