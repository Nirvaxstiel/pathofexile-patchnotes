# Pitfalls — deeper debugging notes

## CSS
- **Tag-vs-ID scoping.** A bare `nav{display:none}` hides *every* `<nav>` — including the sidebar
  `<nav id="toc">`. Scope the mobile top bar to `#mnav` only. Symptom: contents panel shows only the
  league header and the filter "does nothing" (it toggles classes on nodes you can't see).
- **Cross-browser themed scrollbars.** WebKit needs `::-webkit-scrollbar*` (thumb/track/width);
  Firefox needs `scrollbar-width:thin` + `scrollbar-color`. Set both, applied to `body`, `.side`,
  `.toc`, `.diff`. A bare OS scrollbar clashes with the dark palette.
- **Hard borders/shadows.** Neo-brutalist/cyberpunk style: `border:2px solid`, `box-shadow:4px 4px 0 0
  var(--line)` (no blur), `border-radius:0`. Mechanical hover: element lifts + shadow grows; active:
  sinks + shadow vanishes. Neon glow on interactive elements via `box-shadow:0 0 Npx`.

## Fetch / runtime
- **`file://` blocks local fetch.** The SPA loads league JSON via `fetch()`; most browsers refuse
  `fetch()` of local files over `file://`. Serve the folder (`python -m http.server`) or deploy to
  Pages. Document this in the README so users don't open `index.html` directly and see a blank pane.
- **Title/h1 is render state, not build-time.** `renderLeague` MUST set `document.title` and
  `h1.textContent` from the loaded `meta`, or switching leagues leaves a stale title.
- **Manifest is static, committed.** `leagues/index.json` lists `[{version, league, json}]`. Regenerate
  with a one-liner (see README) or hand-edit when adding a league. No build step embeds it.

## Recursion (data invariant)
- `sections[].sections[]` nests arbitrarily. `sectionHtml` AND `tocHtml` must both recurse, and the
  filter walk (`#toc > details`, then nested `:scope details`) must too. A leaf omits `sections`; a
  branch omits `rows`. Forgetting to recurse in either render or filter silently drops nested content.

## Data-entry traps
- **`old` is the previous state, not a restatement of the change.** "No longer counts as party member
  (removes +item quantity…)" is wrong — `old` should describe what it WAS. The `neu` describes the
  resulting state.
- **Don't duplicate the change in `neu` as "was X".** The "was X" pattern in skill-gem `neu` fields is
  intentional (lets you see the delta when filtered to new values), but for plain rows keep `old` and
  `neu` distinct and non-redundant.
- **`img` is row-level only.** Section-level `img` renders nothing.
- **Mixed-signal rows need `pos`/`neg`, not a forced `t`.** Otherwise the badge misrepresents impact.
- **Completeness.** Hand-transcribing 400+ bullets always drops some. Audit per-section (see
  sourcing.md) before declaring done.
