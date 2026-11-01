# SceneIndex Archive 2.0 — operator guide

## What works immediately without configuration

SceneIndex can now **scan a supported forum index page**, identify likely discussion links, rank matches for chosen scene/emo/music terms, and build a browser-persistent import queue of up to 50 URL candidates. Import runs process up to 40 URLs at a time with delays between requests. Each thread is parsed and stored in this browser's IndexedDB. The queue can be paused and resumed across page reloads, **but processing only continues while the page is open**.

Use **Import → Discover threads** with:
`https://www.lpassociation.com/forum/forums/other-music.84/`

1. Click **Scan this forum page**.
2. Review and select actual discussion links. Matches are hints, not genre verification.
3. Click **Add to import queue**.
4. Open **Import queue** and click **Start / resume queue**.

To explore older captures of an index page, choose **Find Wayback captures**, select a snapshot, scan it, and import the identified threads. The original thread URL and capture URL are handled separately. When an imported page lacks a reliable original posting date, SceneIndex marks the date as unknown (or capture-based) instead of inventing a date. Imported material is **not automatically published to the public**.

Index scanning is a one-page operation, **not an unrestricted website crawler**. Some source sites and archives reject requests or have incomplete captures. These are recorded as failures without inventing results.

## Optional shared, cross-device database

This is prepared in source code but **not enabled until the owner configures Cloudflare**.

1. In Cloudflare, create a D1 database called `sceneindex-archive`.
2. Attach it to the **SceneIndex Pages project** using the binding name `SCENE_DB` in project **Settings → Bindings → D1 database**.
3. Apply the SQL in `migrations/0001_archive.sql` **once** using the D1 console or Wrangler. For an initial database, open D1 → select the database → Console, paste the migration SQL, and execute.
4. In the SceneIndex Pages project **Variables and Secrets**, create an **encrypted secret** called `SCENE_ADMIN_TOKEN` containing a long random value. Do not put this secret in GitHub, public code, browser localStorage or chat.
5. Redeploy the Pages project so the binding and secret become available.

Check `https://sceneindex.pages.dev/api/library?mode=status`. Until the D1 binding is present, this endpoint returns `configured:false`; the public site continues functioning locally.

The archive endpoint is public **read-only**:
- `GET /api/library?mode=recent&limit=30&offset=0`
- `GET /api/library?mode=search&q=saosin&limit=30`
- `GET /api/library?mode=thread&id=THREAD_ID`

Only `POST /api/publish` can add material, and it rejects requests without the server-side admin token. Publication also requires `reviewed:true` and accepts at most four threads per request. Source URL, posting dates, copyright and privacy must be reviewed by the site operator before publishing. User imports never automatically publish.

### Example authenticated publication (operator only)

Download a local SceneIndex JSON export and prepare a JSON body such as:

```json
{
  "reviewed": true,
  "threads": [
    {
      "title": "Example historically sourced thread",
      "source": "Example Forum",
      "sourceUrl": "https://example.org/threads/example",
      "date": "2008-04-10",
      "board": "Other Music",
      "posts": [{"author":"Example Member","date":"2008-04-10","text":"Example text"}]
    }
  ]
}
```

The example above is **format documentation only**, not a real thread to publish. The admin token must be entered directly by the operator in their own terminal; never share it. Example:

```sh
curl -X POST https://sceneindex.pages.dev/api/publish \
  -H "Authorization: Bearer $SCENE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @reviewed-threads.json
```

Once enabled, the browser loads up to the 100 most recent shared threads together with the 11 bundled source-linked summaries and your personal imports. The endpoint supports FTS5 keyword search and server-side paging. Fully integrated paginated browsing of an archive with tens of thousands of threads is a **future milestone**.

### Data integrity

- Historical summaries are marked as summaries, not quotations.
- Explicit music preferences and recommendations are separate from mentions; do not treat forum discussions as proven personal taste.
- Capture date and original posting date are distinct.
- Old account identities and sensitive content require care; publishing a public source still needs human review.
- Local imports are stored in IndexedDB; use **Export JSON** for backups.
- D1 and FTS5 row reads/writes count against Cloudflare plan limits. Don't bulk-publish unreviewed material.

## Validation

`npm test` verifies the core recommendation engine, archive URL safety, Wayback URL canonicalization and optional D1 authorization.
`python3 scripts/test-schema.py` validates SQLite/FTS5 compatibility.
`npm run build` builds the website.
The GitHub live smoke workflow tests real page rendering, keyword search, importing a supported URL, forum index link discovery and queue recovery after a reload.
