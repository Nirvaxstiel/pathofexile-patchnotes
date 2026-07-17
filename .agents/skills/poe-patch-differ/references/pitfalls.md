# poe-patch-differ — Pitfalls & Debugging

Concrete failure modes observed while building and maintaining the differ. Read before editing the
template or the builder.

## 1. CSS: bare `nav{}` selector hides the sidebar

The SPA has TWO `<nav>` elements:
- `<nav id="toc" class="toc">` — the left contents panel (must always be visible).
- `<nav id="mnav">` — the mobile-only top bar shown under `@media(max-width:860px)`.

A rule written as `nav{display:none; ...}` applies to BOTH, so the contents panel vanishes and
only the league header shows. The filter then "does nothing" because it toggles `.hidden` on nodes
you can't see. Fix: scope the hidden rule to `#mnav` only:

    #mnav{ ...; display:none; }   /* correct */
    /* NOT: nav{ ...; display:none; }  <- kills the sidebar too */

Symptom checklist: sidebar shows league name but no section list; typing in the filter changes
nothing visible. Grep the built CSS for `nav{display:none` — should be absent; `#mnav{display:none`
should be present.

## 2. Runtime: `fetch()` over `file://` is blocked

`index.html` renders each league by `fetch('leagues/<ver>/<ver>.json')`. Browsers treat `file://`
origin as opaque and refuse cross-file `fetch()` (CORS/opaque-response errors). Opening `index.html`
by double-click yields an empty main pane and a console error.

Fixes, in order of preference:
- Deploy to GitHub/Forgejo Pages (works natively — same-origin http(s)).
- Local preview: `python -m http.server` from the repo root, then visit `http://localhost:8000/index.html`.
- Never tell users to "just open the file" — document the serve step in the repo README.

## 3. Recursion invariant

`sections` is recursive: a section may contain `sections`. Both renderers must recurse:
- `sectionHtml(s)` renders `s.rows` then `(s.sections||[]).map(sectionHtml)`.
- `tocHtml(sections, depth)` renders rows as `<a>`, children as nested `<details>`.

If you add nesting to a league JSON, confirm both functions still recurse. A branch section usually
omits `rows`; a leaf omits `sections`. The filter walk must also recurse (`#toc > details`, then
nested `:scope details`) or nested branches won't filter.

## 4. Build pipeline

- `build_site.py` scans `leagues/*/*.json`, SKIPS `leagues/index.json`, writes `leagues/index.json`
  (manifest: `[{version, league, json}]`) and `index.html`.
- `index.html` embeds `__MANIFEST__` (the league list) only. League DATA is NOT embedded — it is
  fetched at runtime. So re-running `build_site.py` after editing a league JSON is mandatory; the
  manifest drives the `<select>` and the JSON path.
- After build, assert no leftover tokens: grep for `__MANIFEST__` / `__TITLE__` in index.html -> 0.

## 5. Headless verification (no browser)

`scripts/verify_spa.js` stubs a minimal DOM and a `fetch` stub returning a league JSON, evaluates
the page `<script>`, awaits a tick, then asserts the app pane contains a known row key and the TOC
has `<details>`. Run it in CI or after every template edit:

    node scripts/verify_spa.js index.html leagues/3.29/3.29.json Winter

This catches the "sidebar empty / filter dead" class of bug without launching a browser.
