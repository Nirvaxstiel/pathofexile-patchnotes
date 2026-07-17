---
name: poe-patch-differ
description: "Generate a colour-coded before-to-after patch differ (nerfs red, buffs green, changes cyan, new amber) for Path of Exile or any game with the same shape, from a single JSON file. FP, data is the source of truth, rendering is a pure function of data. Reusable league-to-league."
---

# POE Patch Differ

Generate a colour-coded **before → after** patch differ for Path of Exile (or any game with the
same shape) from a single JSON file. Pure data-in, HTML-out. FP: the data is the source of truth;
rendering is a pure function of the data (`render(sections) -> html`). No hand-editing the template.

## Hard rule: stay objective
This is a DIFFER, not an editorial. Never inject trust/opinion/verdict framing, capstone
philosophy, or "this is good/bad for the game" commentary into the data, template, or output.
Each row reports what changed (old → new) and is tagged by mechanical direction (buff/nerf/chg/new).
The user explicitly stripped a trust-lens version and asked for objectivity — keep it that way.
If opinion is wanted later, that is a SEPARATE artifact, not this differ.

## Design principles (user-stated)
- **FP / data-as-pure-structure.** The JSON is the single source of truth. Rendering is a pure
  function of the data; the template never changes per-league. Do NOT hand-edit generated HTML.
- **Dead-easy plug-and-play.** Each league = ONE json file under `leagues/<ver>/<ver>.json`, then a
  single `build_site.py --root .`. No per-league HTML to author. Restyle once in the template,
  rebuild all leagues.

## Invocation (read this — host quirks)
- Use `python` (NOT `python3` — `python3` is missing on this Windows/MSYS host; `python` is 3.11).
- The vault path contains spaces (`Path of Exile`). The interactive terminal shell mangles spaced
  paths under MSYS, so `python build_site.py "/path/with spaces"` can fail with a FileNotFoundError
  on write. **Reliable invocation:** run the builder from execute_code via subprocess with absolute
  Windows-style paths, OR `cd` into the skill dir and run `python scripts/build_site.py --root <repo>`.
  Verify the output exists afterward.
- The SPA fetches league JSON at runtime, so **`file://` opening is blocked by most browsers**
  (opaque-origin `fetch`). Serve the folder (`python -m http.server` from repo root) or deploy to
  GitHub/Forgejo Pages (works natively). Document this in the repo README so users don't open
  `index.html` directly and see a blank pane.

## Sourcing the patch notes (when authoring a new league json)
- poewiki (`Version X.Y.Z`) is **Anubis bot-walled** via curl/web_extract — do not rely on it.
- The official forum thread (`pathofexile.com/forum/view-thread/...`) extracts cleanly via
  `web_extract` (full notes body; the middle may be truncated in the tool preview — the full text
  is saved to a cache file you can read in chunks).
- **The live forum AND poewiki are Cloudflare-blocked to `curl`** (returns a 5KB challenge page or
  a 4.6KB block). Do NOT try to re-fetch art URLs headlessly — they won't resolve, and you must
  never fabricate `web.poecdn.com`/wiki URLs. Ask the user to paste the real image links.
- **`web_extract` strips ALL images** — the cached markdown has zero `<img>`/poecdn URLs. The real
  art links only exist on the live notes page (inline `web.poecdn.com/...`). When the user provides
  one, copy it verbatim into the row's `img` field.
- Process: extract notes → chunk into sections → write rows as `{k,old,neu,t}`. For reworks/bug
  fixes with no clean number, omit `old` (qualitative) rather than inventing a before-value.
- See `references/sourcing.md` for the extraction/chunking recipe.

## Hosting (GitHub Pages / Codeberg Pages)
- GitHub: the bundled `.github/workflows/build.yml` rebuilds + deploys on push.
- **Codeberg/Forgejo needs NO dedicated CI file.** Codeberg Pages serves
  `https://<user>.codeberg.page/<repo>/` directly from the repo (enable Pages in repo settings).
  Do NOT add a `.forgejo/workflows/*.yml` — it's dead weight. Push the same repo and it works.

## When to use
- You have a set of patch notes and want a scannable differ (nerfs red, buffs green, changes cyan, new amber).
- League-to-league reuse: each league is ONE json file. Run the builder. Done.
- You want to keep a repo of patch differs (e.g. `Gaming/Path of Exile/Patchnotes/`).

## The data model (the only thing you write)

A patch is a JSON object:

```json
{
  "meta": {
    "game": "Path of Exile",
    "version": "3.29.0",
    "league": "Curse of the Allflame",
    "launch": "2026-07-24",
    "posted": "2026-07-16",
    "author": "Stacey_GGG",
    "source": "https://www.pathofexile.com/forum/view-thread/3985332"
  },
  "sections": [
    {
      "id": "skills",
      "n": "14",
      "title": "Skill Gem Changes",
      "sub": "System-wide + notable skills",
      "rows": [
        { "k": "Winter Orb", "old": "1 proj, crit 6%, 360-450 cold", "neu": "2-3 proj, 25% freeze, crit 7.5%, 360-539 cold", "t": "buff" },
        { "k": "Elemental Hit", "old": "Added Fire/Cold/Lightning", "neu": "-17% (Spectrum unaffected)", "t": "nerf" },
        { "k": "New Pact gem", "neu": "Exceptional gem — empowers X", "t": "new" }
      ]
    }
  ]
}
```

### Row type `t` — one of:
- `buff` → new value green
- `nerf` → new value red (old struck-through red)
- `chg`  → structural/rewording, cyan
- `new`  → brand-new content, amber (omit `old`)

If `t` is `new` or `old` is absent, only `neu` is shown (amber/green). Otherwise both `old`
(struck-through) and `neu` render side by side — that is the differ.

### Mixed-signal rows: `pos` / `neg` classification
A single change can help AND hurt (e.g. "no longer counts as party member" — combat penalty gone,
but the item-quantity/rarity bonus is also gone). Players weight effects by impact, so the badge is
NOT a naive "any buff ⇒ BUFF". Add `pos` / `neg` arrays of category tags; resolution in
`resolveClass()` is priority-ordered **`loot` (3) > `combat` (2) > `other` (1)**:
- higher-priority side wins; equal priority → `chg`; neither present → fall back to `t`.
- `loot` = quantity/rarity/currency/drop rate/vendor. `combat` = damage/life/defense/cost/cooldown/
  monster stats. `other` = AI/UI/QoL/behaviour.
- Example: `{...,"t":"buff","neg":["loot"]}` → resolves **NERF** (loot loss outranks absent combat).
This is encoded in `templates/patch.template.html` (`resolveClass`) and documented in
`references/schema.md`. Always tag mixed rows with `pos`/`neg` rather than a manual `t`.

### `img` — official art (lightbox)
Rows may carry `"img": "<url>"`. It renders an `IMG` button → a lightbox with zoom (buttons +
scroll), pan (drag), flip H/V, rotate, reset, close. **Source rule:** patch-note bodies embed
`web.poecdn.com/...` image URLs inline (ascendancy trees, uniques, skill icons). Copy those
VERBATIM into `img`. Do NOT invent URLs and do NOT hotlink from wikis. Note: `web_extract` returns
TEXT ONLY (images stripped), so the URL will NOT appear in the extracted notes — the user must
paste the real `web.poecdn.com` link (or you transcribe it from the live notes page). Fabricating
an image URL breaks the objective/source-attributed standard.

## Build (plug and play)

The site is a single-page app. `index.html` is the shell (league selector + collapsible contents
panel); each league renders client-side by fetching its own JSON. No per-league HTML is generated.
`build_site.py` scans `leagues/*/*.json` (skipping `leagues/index.json`), writes the manifest
`leagues/index.json` (`[{version, league, json}]`), and emits `index.html` with the manifest
inlined (`__MANIFEST__` token). League *data* is fetched at runtime, NOT embedded — so re-run the
builder after editing any league JSON.

```bash
python scripts/build_site.py --root .
# -> leagues/index.json  (manifest)
# -> index.html          (SPA shell; serve over http(s) or Pages — file:// fetch is blocked)
```

To add a league: drop `leagues/<ver>/<ver>.json`, re-run `build_site.py`. To restyle, edit ONLY
the template's CSS — never the data. Verify a build headlessly: `node scripts/verify_spa.js
index.html leagues/3.29/3.29.json Winter` (stubs DOM + fetch, no browser).

## Conventions for a patch repo
- Folder e.g. `Patchnotes/`. Each league = one JSON file under `leagues/<ver>/<ver>.json`.
- The JSON is the durable, diffable artifact. `index.html` + `leagues/index.json` are build outputs.
- `index.html` fetches league JSON at runtime; serve over http(s) (GitHub/Forgejo Pages native).

## Pitfalls

- **CSS tag-vs-ID scoping.** A bare `nav{display:none}` hides *every* `<nav>` — including the
  sidebar `<nav id="toc">`. Scope the mobile top bar to `#mnav` only. Symptom of getting this
  wrong: the contents panel shows only the league header and the filter "does nothing" (it toggles
  classes on nodes you can't see). This bug shipped once and looked like a dead filter.
- **`file://` blocks local fetch.** The SPA loads league JSON via `fetch()`; most browsers refuse
  `fetch()` of local files over `file://`. Serve the folder or deploy to Pages. Document this.
- **Recursion is a data invariant, not a feature.** `sections[].sections[]` nests arbitrarily;
  `sectionHtml` AND `tocHtml` must both recurse, and the filter walk (`#toc > details`, then nested
  `:scope details`) must too. A leaf omits `sections`; a branch omits `rows`.
- **Manifest, not data, is embedded.** `index.html` embeds only `__MANIFEST__`. After editing any
  league JSON, re-run `build_site.py` — editing JSON alone won't change a stale `index.html`.
- **Title/h1 is render state, not build-time.** `__TITLE__` is only the initial (newest) league.
  `renderLeague` MUST set `document.title` and `h1.textContent` from the loaded `meta`, or switching
  leagues leaves a stale title. Shipped once: title never changed on league switch.
- **Native `<select>` is not searchable.** Use a custom combobox for the league/version picker
  (text input + filtered `.list` of `.opt`, click/Enter to select, Esc/outside-click to close).
  Make the input `readonly` and `removeAttribute('readonly')` on focus so mobile keyboards stay
  hidden. Do NOT duplicate the league name in both the selector and the contents panel — show it once.
- **Cross-browser themed scrollbars.** WebKit needs `::-webkit-scrollbar*` (thumb/track/width);
  Firefox needs `scrollbar-width:thin` + `scrollbar-color`. Set both, applied to `body`, `.side`,
  `.toc`, `.diff`. A bare OS scrollbar clashes with the dark palette.
- **Preserve the `const $ = id => document.getElementById(id)` helper.** Every render/init function
  uses `$`. A mid-patch edit that replaces the function block can silently drop this line (it lived
  between `countRows` and `renderLeague`); the build still emits but the page throws `ReferenceError:
  $ is not defined` at runtime. After any `<script>` edit, rebuild AND headless-run `verify_spa.js`
  so the error surfaces before commit.
- **Favicon: inline SVG data-URI, not a file.** `<link rel="icon" href="data:image/svg+xml,...">`
  (URL-encoded `<svg>`). No asset to commit, no 404 on Pages. Works on GitHub + Codeberg.
- **Images: data field only, never fabricated.** `img` is optional per row; the lightbox reads it
  as-is. There is NO image extraction step — `web_extract` strips art and the forum is CF-blocked to
  curl. If a row needs art, the `img` URL must come from the user (verbatim `web.poecdn.com` link).
  Shipping a guessed URL breaks source-attribution.
- **`img` is ROW-LEVEL ONLY.** The renderer reads `r.img` inside `renderRow`; a section-level
  `"img"` key is silently ignored (no button appears). If an entire section's art should be
  viewable, put `img` on the first row of that section (or every row that warrants it). Do NOT put
  `img` on the section object — it looks wired but renders nothing. (If you want section-header
  art later, that is a template change to `sectionHtml`, not a data convention.)
- **TWO COPIES OF THE SKILL EXIST — edit the one the build actually reads.** On this host the
  repo ships a copy at `<repo>/.agents/skills/poe-patch-differ/` AND the agent's copy lives at
  `~/.hermes/skills/poe-patch-differ/`. They are NOT symlinked. `build_site.py` resolves the
  template via `here("..//templates/patch.template.html")` — i.e. **relative to the build script
  that's running**, which is the `.agents` copy when invoked from the repo. Editing the `.hermes`
  copy alone produced a silently-stale `index.html` for a whole turn (template edits "worked" but
  never reached the build). Rule: **always edit the `.agents/skills/poe-patch-differ/` copy** (the
  build source), then sync it back to `~/.hermes/skills/poe-patch-differ/` so the two don't drift.
  After ANY template-or-data change, rebuild AND headless-verify before committing.
- **`web_extract` collapses the forum into few very long lines.** The cached `.md` is ~108K chars
  but only ~67 newlines — the whole notes body is one or two giant lines. So naive `search_files`
  / line-grep misses content. To slice into sections: use `re.finditer` over the full string, and
  for each TOC title pick the **largest offset** occurrence (the TOC copy sits near the top at a
  small offset; the real section body is much later). Split each section on `"Return to top"`.
- **Verify completeness with `scripts/coverage_scan.py` (STRICT, per-section).** Hand-transcribing
  400+ bullets always drops some (a whole Breach section was missing once; an Abyssal Jewel
  numeric block was dropped by a summary row). The scanner is strict:
  - Slices the forum cache into its real TOC sections (largest-offset occurrence of each known
    title; forum collapses the notes into one/two giant lines, so titles are space-joined and
    detected via a curated `KNOWN_TITLES` list — NOT a regex that would merge adjacent titles).
  - Reports a **per-section coverage %** so a whole missing section (0%) is obvious.
  - **Numeric-token enforcement:** a change fact carrying ≥2 distinct numbers (ranges like
    "30 to 42", percentages, "(was 23 to 32)") is a HARD miss if NONE of those numbers appear
    in the JSON. Word overlap alone can't fake a missing number — this is what catches dropped
    numeric-value lists that a summary row "covers" on word-overlap.
  - **Truncation detection:** any row whose `neu`/`old` contains "..." is flagged for expansion.
  Run:
  ```bash
  python scripts/coverage_scan.py <forum_cache.md> <league.json>
  ```
  Titles are auto-detected; pass `--titles "A|B|C"` to override. Expect ~90%+ on a finished
  league. The remaining misses are mostly **flavor/lore text and generic footnotes** ("Existing
  versions can be updated with a Divine Orb", "We really hope you enjoy…") that are correctly NOT
  rows — grep-confirm each miss before adding. The per-section % is the real signal: a section
  at <80% with several numeric misses needs a look; a section at 100% with a couple of word-level
  flags is fine.
- **Signal words** the scanner keys on (in `coverage_scan.py` `SIGNALS`): `now, previously, up to,
  increased, reduced, decreased, grants?, removed, added, changed, no longer, instead, chance,
  renamed, reworked, replaces?, converted, split, doubled, halved, tripled, multiplier, more,
  less, from \d, per , duration, radius, cooldown, cost, cap, limit, \bwas\b, \(was, deals, adds,
  scales?, effectiveness, qualit(y|ies), implicit, modifier tier, tier rating, %`. Add to this set
  whenever you find a change type the scanner misses.
- Deeper debugging notes in `references/pitfalls.md`.

## Files in this skill
- `templates/patch.template.html` — the SPA shell + client-side renderer (Wallace Corp / Blade Runner palette).
- `scripts/coverage_scan.py` — line-by-line forum-vs-JSON coverage check (catches dropped bullets).
- `references/schema.md` — full field reference.
- `references/sourcing.md` — how the notes were pulled into JSON.
- `references/img-and-classification.md` — image sourcing + `pos`/`neg` loot>combat>other hierarchy.
- `references/pitfalls.md` — deeper debugging notes (CSS, fetch, recursion).
- `examples/3.29.json` — the extracted 3.29 dataset (reference).
