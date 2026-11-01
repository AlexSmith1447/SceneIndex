# Importing complete historical forum archives into SceneIndex

## Why use an existing dump?

Someone may already have crawled an entire forum before it closed. A downloadable 2019–2020 archive of a 2007 forum is potentially as useful as a 2007 snapshot. **Capture date ≠ original post date**, and SceneIndex records this distinction instead of treating a capture as proof of when a post was written.

Good starting points:

- [Archive Team project directory](https://wiki.archiveteam.org/) — projects often identify Internet Archive items or Wayback collections.
- [Archive Team FAQ](https://wiki.archiveteam.org/index.php/Frequently_Asked_Questions) — describes WARC and CDX file formats and why some dumps aren't public.
- [Internet Archive](https://archive.org/) — searchable catalogue of archival items. An item's catalogue entry does not guarantee its files can be downloaded or that it is a complete forum.
- [Archive Team restoring guide](https://wiki.archiveteam.org/index.php/Restoring) — explains recovering a website from WARC/Wayback content.

### Using the SceneIndex website

Visit **Import → Existing archive collections**:

1. Search archive.org items by a forum name, fandom, or phrase such as `emo forum`.
2. Choose **Files** to inspect the actual downloadable files listed in that item.
3. Use **Download** to obtain a public ZIP/HTML/JSON dump from Internet Archive. SceneIndex does not host the archive itself.
4. Upload the downloaded .zip/.html/.json file through **Import a downloaded archive**. Each extracted page gets a source and is saved into this browser's local library. You can browse and search after importing.
5. Review the per-file report, and export your SceneIndex collection as JSON if you want a backup.

The importer supports ZIP archives of **saved discussion HTML files**, and archives containing a `sceneindex-manifest.json` with file-to-original-URL mappings. A generic ZIP of unrelated material, forum software installation files, or only screenshots won't provide searchable historical discussions.

**Browser safeguards:** maximum ZIP size 24 MB, up to 300 selected HTML/JSON files, 2 MB per extracted file, 80 MB uncompressed contents. Bigger archives require splitting before upload. Browser indexing is local, not a permanent shared public database.

### Converting downloaded WARC / WARC.GZ files

WARC is a recording format and **cannot be treated like a ZIP**. SceneIndex includes a streaming converter using only Python's standard library. It extracts public HTTP 200 HTML response bodies into smaller ZIPs with provenance manifests.

Run on your own computer in a clone of the SceneIndex repository:

```bash
python3 scripts/warc_to_bundle.py ~/Downloads/old-forum.warc.gz --out ./my-forum-zips --pages-per-zip 50 --max-pages 5000
```

For a particular forum domain:

```bash
python3 scripts/warc_to_bundle.py ~/Downloads/old-forum.warc.gz --host www.oldforum.example --pages-per-zip 50 --out ./my-forum-zips
```

Then upload the generated ZIP bundles to SceneIndex, one at a time.

The converter works for ordinary `.warc` and `.warc.gz` files. For `.warc.zst`, first decompress with a local Zstandard tool into `.warc`. Encrypted/restricted archives, chunked HTTP bodies, badly encoded captures, private messages and non-HTML records are **not converted**. Some forums use unusual HTML markup and will need a forum-specific extraction adapter.

**Important:** a WARC may include personal information. Review source rights, accessibility, usernames and sensitive posts before publishing material to a shared archive. Downloading a file does not automatically grant redistribution rights.

### Manifest format

ZIPs made by the converter contain:

```json
{
  "format": "sceneindex-bundle-v1",
  "identifier": "forum-backup.warc.gz",
  "pages": [
    {
      "filename": "pages/000001.html",
      "sourceUrl": "https://forum.example/threads/123",
      "captureDate": "2019-08-17",
      "source": "forum.example"
    }
  ]
}
```

These entries let SceneIndex maintain the original URL, the captured date and the name of the originating WARC. If a page contains its own original message timestamps, those are preferable to the capture date. If neither can be determined, mark the post date as unknown.

### What isn't yet automated

- No unrestricted crawling of all files in an archive.org collection.
- No background fetching of multi-gigabyte WARCs by Cloudflare Pages.
- No assumption that a 2019 snapshot contains every discussion ever created.
- No automatic public publication or synchronization of everything imported into one browser.
- No real-world verification of each old member's intentions from simple keyword matching.

The optional D1 archive in [ARCHIVE_2_0.md](ARCHIVE_2_0.md) supports reviewed publication, but must be configured separately in Cloudflare.
