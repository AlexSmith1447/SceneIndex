# SceneIndex

A late-2000s-style forum archive and music-discovery engine. Built separately from Tumblr Time Machine.

## What already works

- Forum index, thread views, a **native directory of 16 documented historical music communities across seven overlapping scene categories**, artist pages and saved discussions.
- Full-text search across locally indexed threads, with source, year, tag and sort filters.
- Music taste crate: manually enter artists, import a scrobble CSV or optionally use Last.fm recent top artists.
- Explainable music recommendations and forum-author taste overlaps: derived from **real imported conversation evidence**, distinguishing mentions, requests and explicit recommendations.
- Forum index scanning and selectable, locally resumable import queues (up to 40 thread requests per run); HTML/JSON/manual/CSV imports and JSON backups.
- Internet Archive item search, public downloadable-file listings, and browser-side ZIP collections of saved forum pages.
- Streaming offline converter for existing WARC/WARC.GZ forum dumps, preserving original URLs and capture dates.
- **Sixteen** source-linked discussions are preloaded: 11 from LP Association (2006–2009), four from soEmo (2008–2009), and one retrospective Chorus thread (2016). All are clearly labeled editorial summaries, not invented historical quotes.
- Local persistence using IndexedDB (threads) and localStorage (music crate and bookmarks).

**Important:** A directory entry documents a genuine forum or music platform; it does **not** imply that its old conversations have been copied. The native community directory shows true indexed counts, evidence and archive links, and labels missing material transparently.

## Deployment

Repository: https://github.com/AlexSmith1447/SceneIndex

To host the app, create a new **Cloudflare Pages** project connected to this repository:

| Cloudflare option | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Framework | React (Vite), or None with the same build command |

Cloudflare Pages automatically recognizes `functions/api/lastfm.js`.

**Do not reuse the Tumblr Time Machine Pages project.** Keep this site and deployment separate.

### Optional Last.fm profile import

Recent top artists can be fetched through a private server-side Pages Function. Register a Last.fm API application at https://www.last.fm/api/account/create .

In the new Cloudflare Pages project open **Settings → Variables and Secrets → Add**, choose **Encrypt/Secret**, and set:

- Name: `LASTFM_API_KEY`
- Value: your Last.fm API key

Then redeploy. The browser never sees that key. Check `/api/lastfm?status=1` for `configured:true`. A Last.fm CSV import does **not** require an API key.

## Native historical community directory

The **Communities** tab includes 16 historically documented original forums and related music sites. Filter by emo/screamo, scene and mall emo, post-hardcore, pop-punk, electronic/scene, goth/industrial or hardcore/punk, with overlapping facets where appropriate. The site distinguishes former VampireFreaks from newer VampFreaks and present-day Chorus.fm from the old AbsolutePunk archive.

Every community has an in-site detail page with original-site links, Wayback snapshots, a primary historical reference, the number of actually indexed discussions and buttons to open those discussions directly in SceneIndex. The homepage also lists several historically significant communities, even when their posts are not yet indexed. See [research notes and primary sources](docs/HISTORICAL_COMMUNITIES.md).

## Using an existing downloaded forum archive

The new **Existing archive collections** section on the Import page searches Internet Archive's public catalogue, displays available files, and links to original downloads. It can ingest ZIP collections containing saved HTML discussions, an individual saved HTML page, or a SceneIndex JSON export. Extraction is bounded and reported per file. Large original WARC dumps can be converted into ZIPs using `scripts/warc_to_bundle.py` before importing.

See [the archive package guide](docs/ARCHIVE_PACKAGES.md) for supported formats, genuine limitations and instructions.

The homepage has also undergone a content-first [design audit](docs/DESIGN_AUDIT.md): previous faux editorials and template-like cards are replaced by genuine source-derived thread tables, dates, original forum links and recommendation evidence.

## Importing old forums

**Archive Harvester v2 is available.** On the Import page, use **Single URL** to fetch an allowed public forum thread, or **Discover threads** to scan a board/index page for actual linked discussions. Select links, add them to a locally saved queue, and run or resume the import queue. Up to 40 thread URLs can be processed per run with throttling; unprocessed URLs remain stored locally. Processing does not continue when the import page is closed.

The **Find Wayback captures** button queries the Internet Archive CDX index, letting you scan historic index snapshots and fetch actual captured discussions where available. Source sites may deny requests or have gaps. The URL proxy is restricted; the site does not indiscriminately crawl the web. Old posting dates and capture dates are differentiated, and undated content is marked unverified.

1. Save a publicly accessible forum thread as **HTML** with your browser and import that file. HTML extraction is best-effort and targets common markup used by XenForo, vBulletin, phpBB and Invision; different skins may need a site-specific parser.
2. Or use **Paste a thread**: write messages as `Username: message` and separate each reply with a standalone `---` line.
3. SceneIndex builds an index of recognizable artist names, text, usernames, dates, tags and source references.
4. Export your personal collection as JSON so it can be backed up or imported on another device.

The parsing and personal storage happen **in your browser**. A restricted Cloudflare Pages Function can retrieve supported public URLs and archive snapshots on request; the browser doesn't crawl an entire site automatically. Imported discussions are **local and private to that browser**, unless you separately review and publish them to the optional shared database.

## Recommendation model

For each archived thread, SceneIndex extracts artist mentions from a maintained alias catalog. It gives a **stronger weight** to explicit recommendations answering an earlier request than to simple co-mentions. The Discovery page exposes source threads for every supported result and returns an empty state when there is insufficient evidence. Negative preferences are filtered conservatively. Genre tags alone do not produce fake recommendation links.

Search supports exact phrases in quotes and negative terms prefixed with a minus sign, and ranks matches by title, tags, author and post text. Results preview the reply containing the match rather than blindly taking the first message.

Taste overlap uses explicit favorites where the archive provides them, not every artist mentioned. Explicit recommendations rank above mere co-mentions; massive band lists receive reduced weight. This is an interpretable heuristic, **not a mature recommendation model or a claim of verified user sentiment**.

The first verified chain is a 2008 [LP Association discussion](https://www.lpassociation.com/forum/threads/electronica-emo-screamo.27909/): the original poster asked for bands similar to Scary Kids Scaring Kids, Sky Eats Airplane, Breathe Carolina and Forever the Sickest Kids, and another participant suggested The Medic Droid. Starter posts are explicitly **paraphrases** and retain their source link.

## Development

```sh
npm install
npm test
npm run dev
npm run build
```

Uses React, Vite, a static local index, IndexedDB and optional Cloudflare Pages Functions.

## Image credits

The 2009-inspired homepage features genuine period concert photos from Wikimedia Commons:
- [Saosin live on Projekt Revolution tour (2007)](https://commons.wikimedia.org/wiki/File:Saosin_live_on_Projekt_Revolution_tour.jpg) — Markfredrickson, public domain.
- [Taking Back Sunday live in Boston (2007)](https://commons.wikimedia.org/wiki/File:Taking_Back_Sunday_live_in_Boston.jpg) — Debs, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). The photo is cropped/resized by responsive CSS.

The interface takes broad visual inspiration from the user's 2009 AbsolutePunk screenshot; branding, banner copy, and page structure are independently implemented. The original design's history is documented by [Chorus.fm](https://chorus.fm/features/articles/absolutepunk-net-throughout-the-years/).

## Future expansion

- Optional Cloudflare D1 integration is now implemented in code (migrations, read-only browsing and FTS5 search, review-gated admin publishing). It requires the owner's Cloudflare binding and secret setup before becoming operational; see [Archive 2.0 operator guide](docs/ARCHIVE_2_0.md).
- Worker/Queue-based ingestion of explicitly permitted public archives, with per-source parsers, deduplication and resumable jobs.
- MusicBrainz artist identity resolution and broader alias management.
- Integrated pagination and full-scale UI search over a very large D1 corpus, richer artist identity resolution and more real recommendation evidence.
- Collections that produce shareable web URLs rather than only local downloads.
- Separate authentic vBulletin, phpBB and Invision period themes.

## Preservation / rights

This is an independent archive project. Keep visible source attribution, do not imply official affiliation, respect site restrictions and copyrights, and avoid publishing personal information from old accounts without a legitimate reason. User-provided imports are not independently verified. Do not represent summarized text as verbatim historical quotations.
