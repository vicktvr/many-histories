# Many Histories

**Hosting and future updates:** start with [START-HERE.md](START-HERE.md).
This export includes a GitHub Pages workflow. Run `npm ci`, `npm run build`,
and `npm run check` to reproduce its build locally.

A chart-first world history atlas. The homepage remains a coloured, vertical
poster; readers, qualifications and sources open on demand.

## Build and verify

The published site is self-contained static HTML, CSS and JavaScript. Map layout
uses the pinned build-only `@viz-js/viz` dependency. Run `npm ci`, then run in order:

```sh
node scripts/expand-coverage.cjs
node scripts/modern-coverage.cjs
node scripts/prepare-connections.cjs
node scripts/prepare-poster.cjs
node scripts/prepare-regional.cjs
node scripts/prepare-wikipedia.cjs
python3 scripts/fetch-wikipedia.py
node scripts/prepare-regional.cjs
node scripts/build-connections.cjs
node scripts/build-chart.cjs
node scripts/verify.cjs
node scripts/verify-navigation.cjs
node --check dist/app.js
```

Wikipedia fetching needs network access and reuses validated article metadata.
`dist/` is the static publication directory. Builds version CSS and JavaScript
URLs to prevent stale client assets. Generated SVGs also provide downloads.

## Coverage and interactions

There are 228 timeline histories, 189 related topics, 155 additional map-only
frames and 27 original contextual entries. All 324 inventoried reference-poster
labels and 21 country shortcuts retain explicit mappings. The collection remains
selective: poster completeness does not mean an exhaustive history of the world.

All history spans 4500 BCE–2026 CE; Modern era expands 1450–2026 on its own
linear scale. There is no year zero. Height follows duration. Prominence widths
use reviewed editorial tiers and selected coarse expansion/decline phases,
with an optional Equal widths mode. These are not measured territory, population,
economic output, human worth or ancestry. `scripts/prominence-profiles.json`
records the judgments; `dist/prominence-method.json` explains the calculation.
Ongoing entries continue beyond the displayed edge without a predicted end date.

Search is visibly labelled and searches every view, with aliases, dates and
punctuation-insensitive names. The reader's Locate action centres and focuses the
appropriate block or map node. Enlarged phone maps open around their first row,
rather than an empty margin. Map links in readers are expandable, keeping the
article text near the top. Related timeline subperiods locate their parent;
when opened in Connections, mapped subperiods can locate their own map node.
Key events stays visible on mobile and includes Apollo 11's 1969 Moon landing.
Ancient Israel, Judah and Hasmonean Judea have their own timeline blocks;
Second Temple Judaism, continuing Jewish communities/diaspora and the Holocaust
have separate readers with explicit scope and chronology notes.

Connections offers 45 maps and 405 sourced relationships. Every one of the 228
current timeline histories has a map location: 224 have selected historical
relationships, three have context or heritage links only, and Caral has an
explicit evidence limitation rather than an invented succession arrow. This
is coverage of the current atlas, not every relationship in world history.
The searchable Maps catalogue filters by region and includes a downloadable,
per-entry coverage audit (`dist/connection-coverage.json`).

Regional chapters cover Africa, the Americas, Oceania, East and Southeast Asia,
Europe, and West, Central and South Asia. Modern branches include all fifteen
Soviet successor states, Sudan and South Sudan, post-Chagatai Central Asia,
Afghanistan, and the constitutional and independence histories of other regions.
Shared nodes and Continue controls connect chapters; node readers list every
map where the history appears.

Union, division, conquest, independence, colonial rule, changes of government,
contact/influence, context/overlap, and period transitions are separate types.
Context and period links do not assert direct political descent. Map position
and node size do not measure time, territory or ancestry. Every arrow identifies
an event and its limits; selected branches do not imply that omitted communities
or states ceased to exist. Primary museum, academic, archive and official sources
support the regional research in `scripts/regions/`. Existing hand-built maps are
in `scripts/connections-spec.cjs` and `scripts/connection-extensions.cjs`.
The build-time Graphviz layout places both histories and event cards as nodes,
then checks route and label collisions before publication.

## Readers and verification limits

Every entry opens a validated saved Wikipedia introduction, at most 180 words,
with title, canonical HTTPS URL, revision and timestamp. A live request refreshes
that same page ID through the public MediaWiki API. Sequencing, cancellation,
cache expiry, rejection of aborted cache writes and dated offline fallbacks
prevent stale or failed responses
replacing another reader. Wikipedia contributors are credited under CC BY-SA 4.0.
Museum, academic, heritage and archive references support the atlas context.

The full-article link is a native same-tab anchor with a 48px mobile target.
Wikipedia and Locate actions remain outside the scrolling article. Native dialogs,
keyboard navigation, focus restoration and reduced-motion panning are preserved.
URL parameters support era, map, history, article, sizing and index deep links.

Verification checks coverage mappings, Wikipedia metadata, source references,
parent chains, map routes/collisions, four timeline layouts, prominence weights,
reader/network races, search across views, modern reachability and cross-map
navigation, all timeline Locate targets, map catalogue filters and explicit
evidence limitations. Phone map openings are checked at 320, 390 and 600 pixels.
Shared links, keyboard activation and queued dialog transitions have a separate
state test in `scripts/verify-navigation.cjs`. SVGs are rendered for visual review. These checks do not substitute
for browser or real phone testing; that testing was unavailable in this environment.

## Regions explorer

The fourth view provides 12 overlapping collections containing 739 unique entries,
including 140 additional sourced regional and early-history entries. Overview
region headings open the corresponding collection. Full-name cards, dated labels,
local search, type filters and a continuing-histories filter keep smaller and
decentralized societies accessible. Cards do not encode duration or power.

New entries are deliberately regional-only: they are not silently added to the
228 timeline blocks or claimed to have relationships in Connections. Sources and
chronology qualifications remain available in each reader. Human origins and
gradual agricultural developments use qualified dates; living peoples need not
have an invented founding year. Coverage is selected, not exhaustive.
