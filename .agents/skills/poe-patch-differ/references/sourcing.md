# Sourcing POE patch notes → differ JSON

Recipe used to build `examples/3.29.json` from the official 3.29.0 notes. Reuse per league.

## 1. Get the notes text
- **Avoid poewiki** (`https://www.poewiki.net/wiki/Version_X.Y.Z`): fronted by Anubis proof-of-work,
  returns a "Making sure you're not a bot!" page to curl AND to `web_extract`. Not usable here.
- **Use the official forum thread** via `web_extract`
  (`https://www.pathofexile.com/forum/view-thread/<id>`): returns the full notes body as markdown.
  - The tool preview truncates the MIDDLE (head + tail shown, middle saved to a cache `.md`).
  - The saved file is one giant line; `read_file` truncates long lines. To read the middle:
    - Read the cache file with Python (`open(path, encoding="utf-8")`), slice by `body.find("Section Name")`.
    - Re-wrap: `textwrap.wrap(t, 200)` then write to a temp file, then `read_file` that temp in pages.
- The notes are organised by TOC sections. The forum TOC lists the exact section titles for that
  league (e.g. "The Mirage Challenge League", "Endgame Changes", "Skill Gem Changes", "Bug Fixes").
  Use those TOC titles as your `sections[].title` — search the cache body for the SECOND occurrence
  of each title (the first is the TOC itself; the second is the real section body). Section sets
  differ every league, so read the TOC each time rather than assuming a fixed list.

## 2. Chunk into rows
For each changed item write:
```json
{ "k": "<name>", "old": "<before>", "neu": "<after>", "t": "buff|nerf|chg|new" }
```
- Numeric/functional change with a clear before/after → `old` + `neu`, tag `buff` or `nerf`.
- Rework / new source / system change with no clean number → omit `old`, tag `chg` (or `new` if
  the content did not exist before). Do NOT invent a before-value to satisfy a schema.
- Bug fixes are almost all `t:"chg"` with `old` omitted (qualitative).

## 3. Validate + build
The site is an SPA: drop the league json, then run the ONE builder. There is no per-league
`build.py` — only `build_site.py`, which scans `leagues/*/*.json` and regenerates the manifest +
`index.html`.
```bash
python scripts/build_site.py --root <repo>      # writes leagues/index.json + index.html
```
On this host invoke via execute_code subprocess with absolute Windows paths (see SKILL.md
"Invocation" for the spaced-path MSYS gotcha). `build_site.py` does NOT type-validate rows — it
only scans/slices/mirrors. Type correctness (`t` ∈ buff/nerf/chg/new, `old` optional) is enforced
in the template at render time. Proofread your rows after authoring.
Bug fixes are almost all `t:"chg"` with `old` omitted (qualitative).

## 4. Keep json, treat html as build output
The json is the durable, diffable artifact. The SPA fetches it at runtime — after authoring or
editing any league json, re-run `build_site.py` so the manifest + `index.html` pick it up.

## 5. Scope the Bug Fixes section correctly
A patch forum thread often ends with a wall of "Updates for YYYY-MM-DD" hotfix bulletins
(post-launch churn) AFTER the main "Bug Fixes" paragraph. These are NOT part of the launch differ.
Capture ONLY the launch "Bug Fixes" paragraph as rows (stop at the first "Updates for …" line).
Do not fold hotfix bulletins into the differ unless the user explicitly asks for a "Hotfixes"
section.
