import {starterThreads} from "./catalog.js";

const DB="sceneindex-archive",STORE="threads",VERSION=1;
export function openDB(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window))return reject(new Error("IndexedDB is unavailable in this browser."));
    const req=indexedDB.open(DB,VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function transaction(mode,action){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
    action(store,resolve,reject);
    tx.oncomplete=()=>db.close();
    tx.onerror=()=>{db.close();reject(tx.error)};
  });
}
export async function loadThreads(){
  const [local,shared]=await Promise.all([
    transaction("readonly",(s,resolve,reject)=>{const r=s.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}).catch(()=>[]),
    fetch("/api/library?mode=recent&limit=100").then(r=>r.ok?r.json():null).then(d=>d?.configured&&Array.isArray(d.threads)?d.threads:[]).catch(()=>[])
  ]);
  const seen=new Set(),all=[];
  for(const t of [...starterThreads,...shared,...local]){
    const identity=t.sourceUrl?String(t.sourceUrl).toLowerCase().replace(/\/+$/,""):t.id;
    if(seen.has(identity))continue;
    seen.add(identity);all.push(t);
  }
  return all;
}
export async function saveThread(thread){
  return transaction("readwrite",(s,resolve,reject)=>{const r=s.put(thread);r.onsuccess=()=>resolve(thread);r.onerror=()=>reject(r.error)});
}
export async function deleteThread(id){
  if(starterThreads.some(t=>t.id===id))throw new Error("Built-in sourced threads cannot be deleted.");
  return transaction("readwrite",(s,resolve,reject)=>{const r=s.delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});
}
export const readPref=(key,fallback)=>{try{const data=JSON.parse(localStorage.getItem("si:"+key));return data??fallback}catch{return fallback}};
export const writePref=(key,value)=>{try{localStorage.setItem("si:"+key,JSON.stringify(value))}catch{}};
export function exportArchive(threads){
  const result={format:"sceneindex-v1",exportedAt:new Date().toISOString(),threads:threads.filter(t=>t.origin==="user-import")};
  return new Blob([JSON.stringify(result,null,2)],{type:"application/json"});
}
