# Many Histories maintenance

This portable export is intended for a user-owned GitHub repository and GitHub
Pages. For work requested on this repository, update this repository; do not
publish a separate Sites copy unless the user asks for that.

Run `npm ci`, `npm run build`, and `npm run check`. CI uses Node 24 and Python
3.12. Existing verified Wikipedia metadata is bundled; fetching new article
titles requires access to en.wikipedia.org. Do not add API credentials to the
public website. The Actions workflow publishes `dist/` only, after a successful
build/check on main. Pull requests run checks but do not change production.

Preserve the clean, chart-first design and the four views: Overview, Modern era,
Connections and Regions. Keep search, hover names/dates, native Wikipedia links,
reader navigation, keyboard access and phone layouts. Read START-HERE.md and
README.md before editing. Fix sources/generators rather than only their generated
outputs. `dist/data.js`, browser JS and CSS are maintained directly; many other
files under dist are generated. Page structure comes from scripts/page.html.
Commit matching source and generated output after checks.

Regions contains additional histories that do not all have timeline blocks or
map relationships. Do not claim exhaustive world history or invent political
succession, founding dates or cultural disappearance. Distinguish living peoples,
archaeological traditions, states and periods. Keep sources, uncertainty notes,
Wikipedia attribution and the CC BY-SA credit.

Avoid unrelated redesigns. Do not rewrite git history to publish. Preserve any
user branch protections. For a pull-request request, stop at the reviewed PR;
for an authorized publish request, follow the available repository permissions
and verify the resulting deployment. Report browser verification honestly.
