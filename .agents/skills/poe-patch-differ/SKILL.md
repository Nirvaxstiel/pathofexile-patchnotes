---
name: poe-patch-differ
description: "Generate a colour-coded before-to-after patch differ (nerfs red, buffs green, changes cyan, new amber) for Path of Exile or any game with the same shape, from a single JSON file. FP, data is the source of truth, rendering is a pure function of data. Reusable league-to-league."
---

# POE Patch Differ

Generate a colour-coded **before → after** patch differ for Path of Exile (or any game with the
same shape) from a single JSON file. Pure data-in, HTML-out. FP: the data is the source of truth;
rendering is a pure function of the data (`render(sections) -> html`). No hand-editing the output.

## Hard rule: stay objective
This is a DIFFER, not an editorial. Never inject trust/opinion/verdict framing, capstone
philosophy, or "this is good/bad for the game" commentary into the data, template, or output.
Each row reports what changed (old → new) and is tagged by mechanical direction (buff/nerf/chg/new).
The user explicitly stripped a trust-lens version and asked for objectivity — keep it that way.
If opinion is wanted later, that is a SEPARATE artifact, not this differ.

## Architecture (flat, no build step)
- `index.html` is the **self-contained SPA**. It lives at repo root and is edited directly.
  On boot it does `fetch('leagues/index.json')`, populates the league selector, and opens the
  latest league. No `build_site.py`, no template substitution, no two-copy sync.
- `leagues/index.json` is a **static manifest** — `[{version, league, json}]`. Regenerate it with
  a one-liner when adding a league (see README), or hand-edit. It is committed, not built.
- This skill directory is **docs-only**: `SKILL.md` + `references/`. No `scripts/`, no `templates/`.
  The agent reads this to learn the data model and conventions; it never runs a builder.

## Design principles (user-stated)
- **FP / data-as-pure-structure.** The JSON is the single source of truth. Rendering is a pure
  function of the data; the template never changes per-league. Do NOT hand-edit `index.html`'s
  rendered output — there is none; edit `index.html` only for style/behaviour, and edit JSON for data.
- **Dead-easy plug-and-play.** Each league = ONE json file under `leagues/<ver>/<ver>.json`, plus
  one manifest line. No per-league HTML to author, no build to run. Restyle once in `index.html`'s
  `<style>`, it applies to all leagues.

## Invocation (read this — host quirks)
- Use `python` (NOT `python3` — `python3` is missing on this Windows/MSYS host; `python` is 3.11).
- `index.html` fetches league JSON at runtime, so **`file://` opening is blocked by most browsers**
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

## Hosting (GitHub Pages / Codeberg Pages)
- GitHub: `.github/workflows/build.yml` uploads the whole repo as a Pages artifact on push (no build
  step — it's already static).
- **Codeberg/Forgejo needs NO dedicated CI file.** Codeberg Pages serves
  `https://<user>.codeberg.page/<repo>/` directly from the repo (enable Pages in repo settings).
  Do NOT add a `.forgejo/workflows/*.yml` — it's dead weight. Push the same repo and it works.

## When to use
- You have a set of patch notes and want a scannable differ (nerfs red, buffs green, changes cyan, new amber).
- League-to-league reuse: each league is ONE json file. Done.
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
This is encoded in `index.html` (`resolveClass`) and documented in `references/schema.md`.
Always tag mixed rows with `pos`/`neg` rather than a manual `t`.

### `img` — official art (lightbox)
Rows may carry `"img": "<url>"`. It renders an `IMG` button → a lightbox with zoom (buttons +
scroll), pan (drag), flip H/V, rotate, reset, close. **Source rule:** patch-note bodies embed
`web.poecdn.com/...` image URLs inline (ascendancy trees, uniques, skill icons). Copy those
VERBATIM into `img`. Do NOT invent URLs and do NOT hotlink from wikis. Note: `web_extract` returns
TEXT ONLY (images stripped), so the URL will NOT appear in the extracted notes — the user must
paste the real `web.poecdn.com` link (or you transcribe it from the live notes page). Fabricating
an image URL breaks the objective/source-attributed standard.

### `version` — addendum tracking (layer 2, lightweight)
Rows carry an optional `version` field (`"2026-07-16"` / `"2026-07-17"` / `"2026-07-22"`). The site
renders a version badge per row and a collapsible Version History panel derived from the data itself
— no reconstruction, no guessing. Rows from the latest update get a glowing `latest` badge. The
Version filter (top bar) isolates rows from a given date.

## Conventions for a patch repo
- Folder e.g. `Patchnotes/`. Each league = one JSON file under `leagues/<ver>/<ver>.json`.
- The JSON is the durable, diffable artifact. `index.html` (SPA) + `leagues/index.json` (manifest)
  are committed static files — edit `index.html` for style, hand-edit or regenerate the manifest.
- `index.html` fetches league JSON at runtime; serve over http(s) (GitHub/Forgejo Pages native).

## Pitfalls
- **CSS tag-vs-ID scoping.** A bare `nav{display:none}` hides *every* `<nav>` — including the
  sidebar `<nav id="toc">`. Scope the mobile top bar to `#mnav` only.
- **`file://` blocks local fetch.** The SPA loads league JSON via `fetch()`; most browsers refuse
  `fetch()` of local files over `file://`. Serve the folder or deploy to Pages. Document this.
- **Recursion is a data invariant, not a feature.** `sections[].sections[]` nests arbitrarily;
  `sectionHtml` AND `tocHtml` must both recurse, and the filter walk must too. A leaf omits
  `sections`; a branch omits `rows`.
- **Native `<select>` is not searchable.** Use a custom combobox for the league/version picker
  (text input + filtered `.list` of `.opt`, click/Enter to select, Esc/outside-click to close).
  Make the input `readonly` and `removeAttribute('readonly')` on focus so mobile keyboards stay
  hidden. Do NOT duplicate the league name in both the selector and the contents panel — show it once.
- **Cross-browser themed scrollbars.** WebKit needs `::-webkit-scrollbar*`; Firefox needs
  `scrollbar-width:thin` + `scrollbar-color`. Set both, applied to `body`, `.side`, `.toc`, `.diff`.
- **Favicon: inline SVG data-URI, not a file.** `<link rel="icon" href="data:image/svg+xml,...">`.
  No asset to commit, no 404 on Pages. Works on GitHub + Codeberg.
- **Images: data field only, never fabricated.** `img` is optional per row; the lightbox reads it
  as-is. There is NO image extraction step — `web_extract` strips art and the forum is CF-blocked to
  curl. If a row needs art, the `img` URL must come from the user (verbatim `web.poecdn.com` link).
- **`img` is ROW-LEVEL ONLY.** The renderer reads `r.img` inside `rowHtml`; a section-level `"img"`
  key is silently ignored (no button appears). If an entire section's art should be viewable, put
  `img` on the first row of that section (or every row that warrants it).
- **`web_extract` collapses the forum into few very long lines.** The cached `.md` is ~108K chars
  but only ~67 newlines — the whole notes body is one or two giant lines. So naive line-grep misses
  content. To slice into sections: use `re.finditer` over the full string, and for each TOC title pick
  the **largest offset** occurrence (the TOC copy sits near the top at a small offset; the real section
  body is much later). Split each section on `"Return to top"`.
- **Completeness check.** Hand-transcribing 400+ bullets always drops some (a whole Breach section was
  missing once; an Abyssal Jewel numeric block was dropped by a summary row). Verify per-section: slice
  the forum cache into its real TOC sections, report coverage % per section, enforce that numeric
  values actually appear in the JSON (catches dropped numeric lists hidden behind a summary row), and
  flag any row whose text was truncated with `...`. Expect ~90%+ on a finished league.
- **Signal words** to detect change facts: `now, previously, up to, increased, reduced, decreased,
  grants?, removed, added, changed, no longer, instead, chance, renamed, reworked, replaces?, converted,
  split, doubled, halved, tripled, multiplier, more, less, from \d, per , duration, radius, cooldown,
  cost, cap, limit, \bwas\b, \(was, deals, adds, scales?, effectiveness, qualit(y|ies), implicit,
  modifier tier, tier rating, %`.

## Files in this skill (docs-only)
- `SKILL.md` — this file (architecture + data model + pitfalls).
- `references/schema.md` — full field reference.
- `references/sourcing.md` — how the notes were pulled into JSON.
- `references/img-and-classification.md` — image sourcing + `pos`/`neg` loot>combat>other hierarchy.
- `references/pitfalls.md` — deeper debugging notes (CSS, fetch, recursion).
