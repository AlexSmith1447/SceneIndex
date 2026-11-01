# SceneIndex visual audit — November 2026

## Primary references

- The user-provided AbsolutePunk March 2009 screenshot.
- [AbsolutePunk.net Throughout the Years](https://chorus.fm/features/articles/absolutepunk-net-throughout-the-years/), Jason Tate's history of the site's iterations. He notes that 2006–2009 designs were dense and close together, that featured band spots were manually curated, and that the 2009 forum feed was a specific personal highlight.
- [Web Design Museum: Happy Tree Friends Forum (2003)](https://www.webdesignmuseum.org/gallery/happy-tree-friends-in-2003) — historical vBulletin layout, table headings, forum rows and real page data.
- [The AI Design Aesthetic That's Taking Over the Internet](https://www.newyorker.com/the-ai-design-aesthetic-thats-taking-over-the-internet) and [What makes a website look AI-generated?](https://blog.interfacekit.io/what-makes-a-website-look-ai-generated) — critiques of default template shapes and shallow, generic design decisions.

## Failures identified in the previous version

1. **Fake editorial framing.** “Staff Picks,” “Scene Exclusives,” “Archive Network” and slogan banners presented a plausible but unearned 2009 editorial voice. Some linked artists had no substantiated associated article. Replaced with source-derived tables and grounded recommendation relationships.
2. **Too many similar modules.** The same maroon header and box treatment was applied to functions with different priorities. We now use compact tables for repeated forum threads, and reserve modules for discrete directories, navigation, photos and tools.
3. **Recreation announces itself.** Slogans like “The archive is still alive” were louder than the posts. The masthead now identifies the forum archive in period-style terms; the homepage shows the actual indexed source.
4. **Site-specific context was weak.** Photos were repeated and sometimes failed, leaving gray blank space. We now show one primary live photo and supply reliable fallback/credit text.
5. **Generic icons across every element.** Actual mid-2000s forums often used small icons, but not a uniform thin Lucide icon next to each feature. Thread lists use a restrained forum marker and text.
6. **Inconsistent hierarchy.** Different pages competed with a modern card style and broadly similar padding. The homepage now has a clear forum-table hierarchy; inputs and tools remain differentiated.
7. **Fake-vintage surfaces.** Excessive gradients and shadows were layering a modern “retro theme” on top of a normal SaaS website. Final styles use flat maroon bands, narrow borders and straightforward Arial text.

## Constraints for future changes

- Treat source material and actual user actions as more important than branding.
- No fake forum accounts, replies, playlists, popularity scores, rec counts, reviews or staff-pick stories.
- No “hero” slogan on the front page; show the actual threads.
- Keep the period visual system: a ~1000px centered desktop layout, maroon top navigation, 11px Arial, tight table rows, striped backgrounds and a three-column portal with real content. Preserve responsive browsing without over-simplifying mobile.
- Distinguish original post dates from Wayback capture dates; show “unknown” when unknown.
- All images should be historically plausible, source-linked, credited and backed by a useful fallback.
- Preserve loading, error, empty and disabled states, especially for huge archives or unreachable sources.
- Report extracted threads and parse failures honestly; never silently invent text from archive metadata.
- Shared archives require deliberate operator review before publication.

## Acceptance checklist

- [x] Replace faux content modules with actual thread index records.
- [x] Tighten header, navigation, thread row density and typography.
- [x] Support archive catalogue search + downloading an existing item file.
- [x] Import downloaded HTML/JSON/ZIP discussion bundles.
- [x] Provide offline streaming WARC.GZ conversion for large archival dumps.
- [x] Add provenance-aware import failure reporting.
- [x] Validate in browser and CI, including real ZIP import.
- [ ] Activate optional cross-device D1 archive (requires Cloudflare owner credentials and binding).
- [ ] Build source-specific parsers for more legacy forum software layouts.
- [ ] Expand the real archive with verified material and appropriate redistribution permissions.
