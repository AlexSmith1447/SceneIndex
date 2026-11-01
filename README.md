# SceneIndex

A late-2000s-style forum archive and music-discovery engine. Built separately from Tumblr Time Machine.

## What already works

- Forum index, thread views, source directory, artist pages, saved discussions.
- Full-text search across locally indexed threads, with source, year, tag and sort filters.
- Music taste crate: manually enter artists, import a scrobble CSV or optionally use Last.fm recent top artists.
- Explainable music recommendations and forum-author taste overlaps: derived from **real imported conversation evidence**, distinguishing mentions, requests and explicit recommendations.
- Import HTML saved from XenForo, vBulletin, phpBB and Invision boards, SceneIndex JSON, or manually formatted posts; export your local imports.
- Eleven source-linked **2006–2009** LP Association threads are preloaded, shown as clearly marked paraphrases (not verbatim historical messages).
- Local persistence using IndexedDB (threads) and localStorage (music crate and bookmarks).

**Important:** The starter archive contains eleven real, source-linked discussions. The forum directory lists other prospective sources but does not imply that those threads have already been indexed.

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

## Importing old forums

**Live URL importing is now available.** On the Import page, paste a public LP Association or Chorus thread URL and click **Import this URL**. The deployed Cloudflare Pages Function fetches allowed source HTML and the browser parses posts, saving to IndexedDB. Up to 12 URLs can be processed in a user-initiated batch. The **Find Wayback captures** button queries the public Internet Archive CDX index where available; snapshot access is dependent on archive availability, rights, and rate limits. Unsupported direct hosts are deliberately blocked instead of turning SceneIndex into an arbitrary URL proxy. Saved HTML imports work as a fallback.

1. Save a publicly accessible forum thread as **HTML** with your browser and import that file. HTML extraction is best-effort and targets common markup used by XenForo, vBulletin, phpBB and Invision; different skins may need a site-specific parser.
2. Or use **Paste a thread**: write messages as `Username: message` and separate each reply with a standalone `---` line.
3. SceneIndex builds an index of recognizable artist names, text, usernames, dates, tags and source references.
4. Export your personal collection as JSON so it can be backed up or imported on another device.

The import process occurs **in your browser**. It does **not** automatically fetch any remote URL or crawl entire forums yet. Your database is not synchronized across devices. Importing a URL alone is not sufficient: use a saved HTML file, JSON or pasted text.

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

- Cloudflare D1 for a shared, cross-device searchable index, with authorization and provenance checks.
- Worker/Queue-based ingestion of explicitly permitted public archives, with per-source parsers, deduplication and resumable jobs.
- MusicBrainz artist identity resolution and broader alias management.
- A full-text index (SQLite FTS5 on D1), ranking and recommendation network with more real evidence.
- Collections that produce shareable web URLs rather than only local downloads.
- Separate authentic vBulletin, phpBB and Invision period themes.

## Preservation / rights

This is an independent archive project. Keep visible source attribution, do not imply official affiliation, respect site restrictions and copyrights, and avoid publishing personal information from old accounts without a legitimate reason. User-provided imports are not independently verified. Do not represent summarized text as verbatim historical quotations.
