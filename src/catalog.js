// SceneIndex's starter archive contains only source-grounded material.
// Paraphrases are explicitly labeled; no fictional forum conversation is presented as real.
export const starterThreads = [
  {
    id:"lpa-27909", source:"LP Association Forums", sourceUrl:"https://www.lpassociation.com/forum/threads/electronica-emo-screamo.27909/",
    title:"Electronica/Emo-Screamo", board:"Other Music", year:2008, date:"2008-05-29",
    origin:"verified-paraphrase", excerptOnly:true, tags:["electronicore","emo","screamo","recommendations"],
    posts:[
      {id:"lpa-p1",author:"Daniel",date:"2008-05-29",role:"LPA Super Member",text:"Looking for new music similar to My Darkest Hour-era Scary Kids Scaring Kids, Sky Eats Airplane, Breathe Carolina, and Forever the Sickest Kids, especially emo with keyboards. Explicitly does not want BrokeNCYDE or Kill Hannah.",kind:"request",origin:"paraphrase"},
      {id:"lpa-p2",author:"minusxerø",date:"2008-05-29",role:"LPA Addicted VIP",text:"Has seen Breathe Carolina live and thinks they're alright. Recommends The Medic Droid.",kind:"recommendation",origin:"paraphrase"}
    ]
  }
];

export const artistCatalog = [
  ["Sky Eats Airplane",["sea"],"electronicore","2005–2009"],
  ["Scary Kids Scaring Kids",["sksk"],"post-hardcore","2002–2010"],
  ["Breathe Carolina",[],"electronicore","2007–"],
  ["Forever the Sickest Kids",["ftsk"],"pop-punk","2006–"],
  ["The Medic Droid",[],"electropop / scene","2005–2008"],
  ["BrokeNCYDE",["broken cyde"],"crunkcore","2006–"],
  ["Kill Hannah",[],"alternative rock","1993–"],
  ["Fall Out Boy",["fob"],"pop-punk / emo","2001–"],
  ["I Am Ghost",[],"post-hardcore","2004–2010"],
  ["Dear Whoever",[],"post-hardcore","2004–"],
  ["Aiden",[],"post-hardcore","2003–"],
  ["Saosin",[],"post-hardcore","2003–"],
  ["From First to Last",["fftl"],"post-hardcore","1999–"],
  ["Cartel",[],"pop-punk","2003–"],
  ["Cute Is What We Aim For",["ciwwaf"],"pop-punk","2005–"],
  ["Taking Back Sunday",["tbs"],"emo / post-hardcore","1999–"],
  ["Chiodos",[],"post-hardcore","2001–"],
  ["The Devil Wears Prada",[],"metalcore","2005–"],
  ["Pierce the Veil",["ptv"],"post-hardcore","2006–"],
  ["Blessthefall",[],"post-hardcore","2003–"],
  ["Escape the Fate",[],"post-hardcore","2004–"],
  ["The Used",[],"emo / post-hardcore","2001–"],
  ["Silverstein",[],"post-hardcore","2000–"],
  ["Hawthorne Heights",[],"emo / post-hardcore","2001–"],
  ["An Evening at Elmwood",[],"post-hardcore",""],
  ["Of Blessings And Burdens",[],"post-hardcore",""],
  ["Fiore",[],"emo / post-hardcore",""],
  ["My Last Words",[],"emo / screamo",""],
  ["Take A Spin Down Rainbow Road",[],"Nintendocore",""],
  ["iamerror",[],"Nintendocore",""],
  ["Monomate",[],"Nintendocore",""],
  ["The Sea The Sea",[],"emo / screamo",""],
  ["A Day to Remember",["adtr"],"pop-punk / post-hardcore","2003–"],
  ["Motion City Soundtrack",["mcs"],"pop-punk","1997–"],
  ["My Chemical Romance",["mcr"],"emo / alternative rock","2001–"],
  ["The Academy Is...",[],"pop-punk","2003–"]
].map(([name,aliases,genre,years])=>({name,aliases,genre,years}));

export const archives=[
  {name:"LP Association Forums",era:"2000s–present",description:"Music talk and surviving early-2000s forum threads",link:"https://www.lpassociation.com/forum/",status:"One sourced thread indexed"},
  {name:"AbsolutePunk",era:"2000–2016",description:"News, reviews and once-extensive emo/pop-punk forums",link:"https://chorus.fm/",status:"Source discovery planned"},
  {name:"Bridge 9 Board",era:"2002–2017",description:"Hardcore and punk community discussion",link:"https://web.archive.org/web/*/http://www.b9board.com/",status:"Capture research planned"}
];
