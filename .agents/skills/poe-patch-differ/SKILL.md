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
- **Dead-easy plug-and-play.** Each league = ONE json file run through `build.py`. No server, no
  build step beyond that one command, no hand-authored markup. Restyle once in the template,
  rebuild all leagues.

## Invocation (read this — host quirks)
- Use `python` (NOT `python3` — `python3` is missing on this Windows/MSYS host; `python` is 3.11).
- The vault path contains spaces (`Path of Exile`). The interactive terminal shell mangles spaced
  paths under MSYS, so `python build.py "path/with spaces.json"` can fail with a FileNotFoundError
  on write. **Reliable invocation:** run the builder from execute_code via subprocess with absolute
  Windows-style paths, OR `cd` into the skill dir first and pass only the json filename + `-o`.
  Verify the output exists afterward.
- Output HTML embeds the JSON inline, so it opens from `file://` with no server. Keep it that way
  (do not switch to fetch() — breaks local opening).

## Sourcing the patch notes (when authoring a new league json)
- poewiki (`Version X.Y.Z`) is **Anubis bot-walled** via curl/web_extract — do not rely on it.
- The official forum thread (`pathofexile.com/forum/view-thread/...`) extracts cleanly via
  `web_extract` (full notes body; the middle may be truncated in the tool preview — the full text
  is saved to a cache file you can read in chunks).
- Process: extract notes → chunk into sections → write rows as `{k,old,neu,t}`. For reworks/bug
  fixes with no clean number, omit `old` (qualitative) rather than inventing a before-value.
- See `references/sourcing.md` for the extraction/chunking recipe.

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

## Build (plug and play)

The site is a single-page app. `index.html` is the shell (league selector + collapsible contents
panel); each league renders client-side by fetching its own JSON. No per-league HTML is generated.

```bash
python build_site.py --root .
# -> leagues/index.json  (manifest: [{version, league, json}, ...])
# -> index.html          (SPA shell; opens from file:// or GitHub/Forgejo Pages)
```

The template lives at `templates/patch.template.html`. `build_site.py` scans `leagues/*/*.json`,
writes the manifest, and emits `index.html` with the manifest inlined (`__MANIFEST__` token).
To add a league: drop `leagues/<ver>/<ver>.json`, re-run `build_site.py`. To restyle, edit ONLY
the template's CSS — never the data.

## Conventions for a patch repo
- Folder e.g. `Patchnotes/`. Each league = one JSON file under `leagues/<ver>/<ver>.json`.
- The JSON is the durable, diffable artifact. `index.html` + `leagues/index.json` are build outputs.
- `index.html` fetches league JSON at runtime; serve over http(s) or a browser that permits
  local `file://` fetches. (GitHub/Forgejo Pages works natively.)

## Files in this skill
- `templates/patch.template.html` — the SPA shell + client-side renderer (Wallace Corp / Blade Runner palette).
- `scripts/build_site.py` — scan leagues -> manifest + index.html.
- `references/schema.md` — full field reference.
- `references/sourcing.md` — how the notes were pulled into JSON.
- `examples/3.29.json` — the extracted 3.29 dataset (reference).
