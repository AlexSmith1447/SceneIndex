#!/usr/bin/env python3
"""Convert a pre-existing public WARC/WARC.GZ dump into bounded SceneIndex HTML ZIPs.

No crawling, no API keys, no third-party Python packages. Records are streamed.
Only unencrypted public HTTP 200 HTML *response* bodies are included.
Personal/private material must be reviewed before publishing.
"""
import argparse, gzip, io, json, re, sys, zipfile
from pathlib import Path
from urllib.parse import urlparse

MAX_HTML = 1_500_000
def records(stream):
    while True:
        line=stream.readline()
        if not line: return
        if not line.startswith(b"WARC/"): continue
        headers={}
        while True:
            line=stream.readline()
            if not line: return
            if line in (b"\r\n",b"\n"): break
            if b":" in line:
                k,v=line.split(b":",1)
                headers[k.decode("latin-1").lower().strip()]=v.decode("latin-1").strip()
        try: length=int(headers.get("content-length","-1"))
        except ValueError: raise ValueError("Invalid WARC content length")
        if length<0: continue
        # Don't allocate large records: stream-discard when irrelevant.
        if headers.get("warc-type")!="response" or length>MAX_HTML+80_000:
            while length:
                buf=stream.read(min(length,64*1024))
                if not buf: return
                length-=len(buf)
            continue
        payload=stream.read(length)
        if len(payload)!=length:return
        yield headers,payload

def html_payload(response):
    sep=b"\r\n\r\n"
    pos=response.find(sep)
    if pos<0: sep=b"\n\n";pos=response.find(sep)
    if pos<0:return None
    head=response[:pos].decode("latin-1","replace")
    if not re.search(r"^HTTP/\d(?:\.\d)?\s+200\b",head,re.I):return None
    if not re.search(r"(?im)^content-type:\s*(?:text/html|application/xhtml\+xml)",head):return None
    if re.search(r"(?im)^transfer-encoding:\s*chunked",head):return None
    body=response[pos+len(sep):]
    if len(body)>MAX_HTML:return None
    return body

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("archive",type=Path,help="Existing .warc or .warc.gz file")
    ap.add_argument("--out",type=Path,default=Path("sceneindex-warcs"),help="Output directory")
    ap.add_argument("--pages-per-zip",type=int,default=150)
    ap.add_argument("--max-pages",type=int,default=2000)
    ap.add_argument("--host",action="append",help="Only capture this original hostname (repeatable)")
    args=ap.parse_args()
    if not 1<=args.pages_per_zip<=250 or not 1<=args.max_pages<=50000:ap.error("Invalid page limit")
    if not args.archive.exists():ap.error("Archive file not found")
    args.out.mkdir(parents=True,exist_ok=True)
    allowed={h.lower().strip() for h in (args.host or [])}
    open_stream=gzip.open if args.archive.name.lower().endswith(".gz") else open
    bundle=None;manifest=[];saved=0;series=0;skipped=0
    try:
        with open_stream(args.archive,"rb") as src:
            for meta,payload in records(src):
                original=meta.get("warc-target-uri","")
                url=urlparse(original)
                if url.scheme not in ("http","https") or not url.hostname:continue
                if allowed and url.hostname.lower() not in allowed:continue
                body=html_payload(payload)
                if body is None:skipped+=1;continue
                if bundle is None or len(manifest)>=args.pages_per_zip:
                    if bundle:
                        bundle.writestr("sceneindex-manifest.json",json.dumps({"format":"sceneindex-bundle-v1","pages":manifest,"source":"WARC conversion","identifier":args.archive.name},indent=2))
                        bundle.close()
                    series+=1;manifest=[]
                    path=args.out/f"sceneindex-bundle-{series:03}.zip"
                    bundle=zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=6)
                name=f"pages/{saved+1:06}.html"
                bundle.writestr(name,body)
                capture=meta.get("warc-date","")[:10]
                manifest.append({"filename":name,"sourceUrl":original,"source":url.hostname,"captureDate":capture})
                saved+=1
                if saved%100==0:print(f"Processed {saved} HTML captures",file=sys.stderr)
                if saved>=args.max_pages:break
    finally:
        if bundle:
            bundle.writestr("sceneindex-manifest.json",json.dumps({"format":"sceneindex-bundle-v1","pages":manifest,"source":"WARC conversion","identifier":args.archive.name},indent=2))
            bundle.close()
    print(json.dumps({"pages_saved":saved,"files_created":series,"non_html_records_skipped":skipped,"output_directory":str(args.out)},indent=2))
    if not saved:
        print("No importable public HTML response records found. This WARC may contain non-HTML or compressed HTTP bodies.",file=sys.stderr)

if __name__=="__main__":
    main()
