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
- The notes are organised by TOC sections (League, Mercenaries, Abyss, Legion, Gem Sockets,
  Talisman, Skill Gem Changes, Vaal Gem Changes, Support Gem Changes, Unique Item Changes,
  Item Changes, Divination, Ruthless, Monsters, Quests, UI/QoL, Bug Fixes). Use those as `sections[]`.

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
```bash
python scripts/build.py <league>.json            # writes <league>.html next to it
python scripts/build.py <league>.json -o out.html
```
On this host invoke via execute_code subprocess with absolute Windows paths (see SKILL.md
"Invocation" for the spaced-path MSYS gotcha). Builder validates types and section ids; it does
NOT require `old` for non-`new` rows.

## 4. Keep json, treat html as build output
The json is the durable, diffable artifact. Regenerate the html whenever the template is restyled.
