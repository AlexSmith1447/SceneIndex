# Classic YouTube / 2013 Time Capsule

## November 7, 2026 — reference-led 2013 visual revision

The interface now prioritizes reconstructing a signed-in mid-2013 YouTube layout rather than branding itself as an archive:
- Desktop: YouTube-style 2013 top header/search, Upload link, signed-in profile, Guide sidebar, What to watch feed, understated 3-column video groups, contemporary-looking channel/watch/search layouts.
- Mobile: the 2012–2013 YouTube iPhone app's dark header, left-swipe Guide drawer, full-width activity feed, and About/Suggested/Comments watch tabs. No modern bottom navigation.
- The local profile defaults to WesleyPigeon330. It is editable in Settings and does **not** authenticate with YouTube.
- Removed visible Time Capsule branding, year badges, an invented featured video, and custom promotional panels. Year restriction remains in Settings.
- Video embeds remain mounted when switching information/comment tabs, avoiding playback restarts.
- Old homepage UI is reference-led, not a validated pixel-identical replication. Historical thumbnails/views/comments cannot be inferred from current data.

Visual research references:
- YouTube homepage at Version Museum: https://www.versionmuseum.com/history-of/youtube-website
- Official April 2013 signed-in homepage update: https://blog.youtube/news-and-events/coming-soon-more-videos-in-homepage-feed/
- 2012/2013 iPhone app: https://www.macstories.net/news/youtube-for-ios-gets-iphone-5-and-airplay-support-ipad-version/
- January 2013 signed-in layout: https://ics.uci.edu/~djpatter/classes/2013_01_INF134/journalExample.pdf

## Status (initial mobile/desktop PWA)

A separate static app lives under /classic/ in the existing SceneIndex Pages deployment. The forum remains at /. Vite should copy public/classic/* to dist/classic/* using the existing build script.

### Implemented
- Responsive 2013-inspired web app (desktop sidebar + iPhone bottom navigation)
- Standalone web app manifest, service worker and SVG icon
- Official YouTube iframe playback, plus a link to the original watch page
- Historical cutoff defaulting to 2013, local saved videos, viewing history, settings and discovery shuffling
- A small source-checked starter catalogue, including Ze Frank's 2013 Teddy Has An Operation (as an ordinary video, not featured)
- Local search and paste-YouTube-URL playback. Unknown upload dates are clearly labeled.
- Optional public YouTube Data API v3 search, video metadata and surviving dated comment samples via Cloudflare Pages Function

### Not yet implemented
- Full YouTube search (until an operator configures an API key)
- Archived channel art, descriptions and avatars (the setting is a future-facing preference)
- A true reconstruction of the proprietary YouTube 2013 recommendation algorithm and historic trending
- Deleted videos and comments, complete archival discussions, or YouTube account sync
- The separate V3 / StarTube userscript integration
- End-to-end real-world browser and deployment verification

## Open the app

After Cloudflare Pages has deployed the latest main branch: https://sceneindex.pages.dev/classic/

On an iPhone: Safari > Share > Add to Home Screen. SVG icon support is available in modern Safari, but actual icon behavior can vary with the browser version.

## Enable wider YouTube discovery

In the existing SceneIndex Cloudflare Pages project:
1. Settings > Variables and Secrets.
2. Create an encrypted secret named YOUTUBE_API_KEY containing a valid YouTube Data API v3 API key.
3. Make sure that API is enabled for the API key's Google Cloud project.
4. Redeploy the existing Pages project.
5. Check /api/youtube?mode=status for configured:true.
6. Open /classic/ and search, or use Discover > Find more on YouTube.

Key stays server-side. The optional Pages Function only uses documented public YouTube Data API v3 methods (search.list, videos.list, commentThreads.list). Query results have a bounded cache. A search.list request costs 100 quota units, so an ordinary 10,000-unit daily quota supports at most around 100 uncached searches per day, ignoring other API calls. Do not silently fire dozens of requests.

Comment display is a partial surviving sample, not a historical archive. Historical channel avatars are not fabricated. The actual current YouTube data may differ from what people saw in 2013.

## References and attribution

- StarTube, MIT: https://github.com/lightbeam24/StarTube
- VORAPIS V3, closed-source dependency: https://github.com/vorapis-yt/v3
- bygone-yt, MIT: https://greasyfork.org/en/scripts/580843-bygone-yt

No code from V3, StarTube, or bygone-yt is currently bundled in the PWA. The initial mobile version is an independent UI implementation informed by historical visual design. YouTube is a trademark of its owners. The app is not affiliated with or endorsed by YouTube.

## Rollback

SceneIndex's root entry point and forum source files were not replaced. The new additions are under public/classic/, functions/api/youtube.js and this document. Removing those additions restores the pre-prototype project structure.
