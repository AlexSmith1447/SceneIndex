"""Offline integration test: make a tiny WARC, convert it, verify source and capture date."""
import tempfile,subprocess,sys,json,gzip,zipfile
from pathlib import Path
with tempfile.TemporaryDirectory() as td:
 root=Path(td);source=root/"captured.warc.gz";out=root/"bundles"
 html=b'<html><h1>Historical discussion</h1><article class="message" data-author="OldMember"><time datetime="2007-04-12"></time><div class="bbWrapper">Good melodic emo records.</div></article></html>'
 http=b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"+html
 header=(b"WARC/1.0\r\nWARC-Type: response\r\nWARC-Target-URI: https://oldforum.example/thread/123\r\nWARC-Date: 2019-11-01T10:00:00Z\r\nContent-Length: "+str(len(http)).encode()+b"\r\n\r\n")
 with gzip.open(source,"wb") as f:f.write(header+http+b"\r\n\r\n")
 proc=subprocess.run([sys.executable,"scripts/warc_to_bundle.py",str(source),"--out",str(out),"--pages-per-zip","10"],capture_output=True,text=True,check=True)
 data=json.loads(proc.stdout)
 assert data["pages_saved"]==1,data
 files=list(out.glob("*.zip"))
 assert len(files)==1,files
 with zipfile.ZipFile(files[0]) as z:
  names=z.namelist()
  assert "pages/000001.html" in names,names
  manifest=json.loads(z.read("sceneindex-manifest.json"))
  page=manifest["pages"][0]
  assert page["sourceUrl"]=="https://oldforum.example/thread/123",page
  assert page["captureDate"]=="2019-11-01",page
  assert b"Historical discussion" in z.read("pages/000001.html")
 print("Streaming WARC.GZ to imported HTML ZIP / manifest test passed")
