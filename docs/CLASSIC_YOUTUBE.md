# Classic YouTube / 2013 Time Capsule

## November 8, 2026 — recommendations, watch details and comments revision

The original keyword-cohort ranker remains as the source-discovery fallback, but is no longer the entire recommendation logic. The browser now uses a TF-IDF + cosine content similarity baseline adapted from the MIT-licensed **WatchLens** project (similarity.py), plus the existing exposure-aware browsing and diversity controls. Similarity considers video titles, descriptions and tags. Recent watched videos build a local content-interest vector. Watch pages use video-to-video similarity to select relevant recommendations. This is not a trained YouTube-scale collaborative model; those require a large interaction corpus and additional infrastructure.

- Similarity implementation: public/classic/similarity.js
- Source: https://github.com/WatchLens/WatchLens
- MIT notice: public/classic/THIRD_PARTY_NOTICES.txt
- The Cloudflare discovery source now fetches public description and tag metadata from documented YouTube APIs; current Cloudflare and browser discovery caches were versioned to avoid old incomplete metadata.

Comment fixes:
- For period comments (default), the API now checks up to four 100-thread pages per click rather than only the first. An older year cutoff is applied to top-level comments *and* previews of surviving replies. Load more uses continuation tokens.
- A second "All comments" tab shows modern and older surviving comments without the cutoff; this is not a period snapshot. Some old videos may still require many pages before old comments appear; deleted comments cannot be restored.
- Real authorProfileImageUrl, names, publish dates and likes are now shown; no invented profile photos. Some available replies are shown, with an option to request more for the selected thread.
- Requests are bounded, cached and limited to documented commentThreads.list / comments.list methods.

Watch and channel details:
- The About section now displays available video description, publication date, current view count, current like count and uploader.
- A green/red vintage ratio bar is supplied from **Return YouTube Dislike** estimated like/dislike data when available, with a linked attribution. Estimates are not official counts and must *not* be mistaken for how many likes/dislikes the video had in 2013. The current YouTube Data API does not publish public dislike counts.
- The user may see the current channel avatar, description and subscription statistic. **Archival 2013 channel avatars are not implemented.** Avoid silently presenting current imagery as a verified historical archive.
- The app's local Like/Dislike button interactions are not posted to YouTube.
- The official YouTube iframe player is unchanged, due to required official controls and branding.

The user already configured YOUTUBE_API_KEY in their Cloudflare Pages project. No additional YouTube secret is required for these changes. An optional separate Return YouTube Dislike API endpoint is publicly accessible via functions/api/ratings.js.

Outstanding limitations: the recommendation candidate pool is still mostly gathered through subject searches and is much smaller than YouTube's proprietary graph. WatchLens RecBole collaborative models require a separate Python backend and interaction dataset; copying the model without data would not create YouTube-quality recommendations. Historical channel image restoration, richer reply pagination, and the modern player styling remain later work.

## November 8, 2026 — recommendation engine and mobile bug fixes

The previous homepage rotated a manually selected 14-video starter catalog; that remains a fallback **only when the optional YouTube Data API is unavailable**. The new connected discovery implementation:
- Uses Cloudflare Pages Function /api/discover to retrieve real videos within varying pre-2014 (default year 2013) publication windows. Search results are verified through videos.list for public, embeddable status and duration metadata.
- Rotates across many broad subjects, not a hardcoded list of YouTubers, and labels source cohorts as familiar / adjacent / general / obscure.
- Client-side rankFeed deliberately targets 40% familiar, 25% adjacent, 25% general, 10% obscure, when enough results exist; it reduces repeats, uses watched history and local reactions, and limits the number of videos from the same uploader.
- Cold-start accounts are not assigned a fake personal interest. Candidate groups vary across categories and time windows.
- Cloudflare cache stores public cohort responses for 24 hours. Browser cache holds up to 360 public video entries for 24 hours; at most 12 browser-initiated discovery requests occur daily. This avoids hitting platform search quotas too quickly.
- Homepage displays freshly discovered results when present, with Load more and Refresh; it stops claiming a fixed handpicked set is a genuine recommendation feed.
- iOS Safari search/settings inputs now use 16px text to stop automatic input-focus page zoom while preserving user pinch-to-zoom.
- The gear icon has a filled bevelled metallic center.

**Mandatory configuration for live discovery:** in the existing SceneIndex Cloudflare Pages project, add the encrypted YOUTUBE_API_KEY secret and enable YouTube Data API v3 for that key, then redeploy. Without this secret, the server cannot search the wider YouTube catalog; the homepage uses the starter fallback. No YouTube account access or login is required for this feature.

**Provider quota note:** As of November 2026, Google's documentation describes a distinct default allowance of 100 search.list calls per day, plus 10,000 daily units for other API calls, subject to provider changes. The project uses public documented search.list and videos.list endpoints and does not bypass authentication, scrape private endpoints, or claim to reproduce the original YouTube ranking model.

Visual and playback limitations are unchanged. Comments still need a separate reliability pass.

## November 8, 2026 — iPhone 2013 UI fidelity pass

Target reference: **Google YouTube for iOS, version 1.x (late 2012 through spring 2013)**, deliberately excluding the August 2013 version 2.0 redesign. This distinction is important: the old Videos/Channels search segment, brushed-metal gear and early slide-out channel Guide belong to the 1.x design.

Implementation:
- Custom vector icon atlas at public/classic/icons.svg, with 31 source-authored SVG symbols. A single reusable SVG file supplies the same visual elements to desktop and mobile. The gear is specifically illustrated with 2013-style teeth, metallic gradient, dark center, and recessed visual treatment; no emoji placeholder.
- New high-priority stylesheet public/classic/period-accuracy.css draws layered dark gradients, inset dual-search tab controls, pixel-sized bevels, small typography, 2013 video rows and dark player action bar.
- Mobile search has Videos/Channels segments and a gear-filter menu. Desktop search remains supported. Optional channel search uses documented YouTube Data API v3 rather than internal private endpoints.
- Channel results have their own avatar/list layout. Video rows can show real duration badges and view counts when metadata is available. No fake metadata is invented.
- Mobile side Guide is separate from the desktop Guide, and follows the period's account → Settings/Add Channels → Home Feed/subscriptions → From YouTube categories structure.
- Mobile watch page includes period-inspired like/dislike/share SVG controls and recessed About/Suggested/Comments tabs. Local like/dislike interactions are not sent to YouTube. The official player remains unchanged inside its iframe.
- The styles are a visual reconstruction based on screenshots, not yet verified pixel-for-pixel across iPhone sizes. Precise historical logo geometry, uploaded video avatars, native 2013 iOS status bar/keyboard, and official YouTube player chrome remain limitations.

The desktop wordmark uses the authentic 2011–2013 SVG logo from Wikimedia Commons (public-domain textlogo; YouTube trademark still applies): https://commons.wikimedia.org/wiki/File:Logo_of_YouTube_(2011-2013).svg. The iPhone header uses separate white-on-dark logo styling for the native app appearance.

Primary period references:
- MacStories, original interface and search segmented gear: https://www.macstories.net/stories/the-reality-check-of-googles-new-youtube-app/
- MacStories, December 2012 player / Guide: https://www.macstories.net/news/youtube-for-ios-gets-iphone-5-and-airplay-support-ipad-version/
- Original Google launch article: https://blog.google/products-and-platforms/products/youtube/introducing-new-youtube-app-for-your/
- iMore original Guide: https://www.imore.com/youtube-iphone-reivew
- April 2013 YouTube 1.3 update: https://www.engadget.com/2013-04-15-youtube-for-ios-gets-a-major-update.html

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

Key stays server-side. The optional Pages Function only uses documented public YouTube Data API v3 methods (search.list, videos.list, commentThreads.list). Query results have a bounded cache. Google currently documents a separate default pool of 100 search.list calls per day and a 10,000-unit quota for other endpoints. Cloudflare response caching avoids unnecessary duplicate searches. Do not silently fire dozens of requests.

Comment display is a partial surviving sample, not a historical archive. Historical channel avatars are not fabricated. The actual current YouTube data may differ from what people saw in 2013.

## References and attribution

- StarTube, MIT: https://github.com/lightbeam24/StarTube
- VORAPIS V3, closed-source dependency: https://github.com/vorapis-yt/v3
- bygone-yt, MIT: https://greasyfork.org/en/scripts/580843-bygone-yt

No code from V3, StarTube, or bygone-yt is currently bundled in the PWA. The initial mobile version is an independent UI implementation informed by historical visual design. YouTube is a trademark of its owners. The app is not affiliated with or endorsed by YouTube.

## Rollback

SceneIndex's root entry point and forum source files were not replaced. The new additions are under public/classic/, functions/api/youtube.js and this document. Removing those additions restores the pre-prototype project structure.
