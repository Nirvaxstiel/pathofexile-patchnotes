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

## 6. Title / h1 is render state, not build-time
`__TITLE__` is only the newest league, baked at build time. `renderLeague(data)` MUST set
`document.title` and `h1.textContent` from `data.meta` (`Patch Differ — <version> <league>`), or
switching leagues leaves a stale title. Shipped once: title never changed on league switch. When
patching the template, grep the built JS for `document.title =` to confirm it tracks the load.

## 7. Searchable selector — never a native `<select>`
Native `<select>` cannot be typed into. For the league/version picker use a custom combobox:
- markup: `<div class="dd"><input id="leagueIn" readonly><div class="list" id="leagueList"></div></div>`
- `buildLeagueList(q)` filters `LEAGUES` by `(version + " " + league)` lowercased, sorts newest-first,
  renders `<div class="opt" data-json=...>`. Click / Enter(top match) selects; Esc / outside-click closes.
- `readonly` + `removeAttribute('readonly')` on focus keeps mobile keyboards from popping on a picker.
- Do NOT duplicate the league name in both the selector and the contents panel — show it once.

## 8. Themed scrollbars (cross-browser)
A bare OS scrollbar clashes with the dark palette. Set both engines:
```css
*{scrollbar-width:thin;scrollbar-color:var(--line) transparent}      /* Firefox */
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--amber),var(--cyan));border-radius:6px;border:2px solid var(--bg)}
```
Apply to `body`, `.side`, `.toc`, `.diff`.

## 9. Headless recipe caveats
When hand-rolling a `node` DOM stub (instead of `verify_spa.js`), `document.querySelector('h1')`
must return the SAME node each call or `textContent` won't persist (a stub returning a fresh node
shows empty `H1` even though the real DOM keeps it — assert `document.title` instead). And `let`
declarations inside an `eval(js)` are block-scoped to the eval, so reassigning a top-level
`LEAGUES` from outside won't reach the eval'd functions — unit-test pure helpers (the
`buildLeagueList` filter expression) in isolation to avoid that scoping trap.
