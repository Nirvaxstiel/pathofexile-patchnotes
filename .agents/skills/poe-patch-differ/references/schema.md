# POE Patch Differ — Data Schema

The differ is driven entirely by a JSON document. Rendering is a pure function of this data; the
template never changes per-league.

## Top level

| field    | type   | required | notes                                         |
|----------|--------|----------|-----------------------------------------------|
| `meta`   | object | yes      | Header/legend metadata (see below)            |
| `sections` | array | yes     | Ordered list of sections (see below)          |

### `meta` fields (all optional but recommended)
| field    | example                                    |
|----------|--------------------------------------------|
| `game`   | `"Path of Exile"`                          |
| `version`| `"3.29.0"`                                 |
| `league` | `"Curse of the Allflame"`                  |
| `launch` | `"2026-07-24"`                             |
| `posted` | `"2026-07-16"`                             |
| `author` | `"Stacey_GGG"`                             |
| `source` | `"https://www.pathofexile.com/forum/..."`  |

Unknown meta keys are ignored. Missing keys simply omit that tag in the header.

## `sections[]`

| field  | type   | required | notes                                              |
|--------|--------|----------|----------------------------------------------------|
| `id`   | string | yes      | URL anchor + nav target (unique, kebab-case)       |
| `n`    | string | no       | Section number shown in the heading (e.g. `"14"`)  |
| `title`| string | yes      | Section heading                                    |
| `sub`  | string | no       | Sub-heading / one-line context                     |
| `rows` | array  | yes*     | Changed items (see below)                          |
| `sections` | array | no   | **Optional, recursive.** A section may contain nested `sections` (sub-groups). The contents panel and the rendered page both recurse, so you can build arbitrary depth (e.g. a league → category → sub-category → rows). A parent section with `sections` usually omits `rows`, but you may mix both. |

`* rows` is required at a leaf (a section with no `sections`). A branch section uses `sections` instead.

## `sections[].rows[]`

| field | type   | required | notes                                                       |
|-------|--------|----------|-------------------------------------------------------------|
| `k`   | string | yes      | The changed thing (gem, unique, mechanic, system…)          |
| `old` | string | no*      | Previous state. Struck-through red. Omit for `new` OR when the change is qualitative (rework, new source, bug fix) with no clean before/after number. |
| `neu` | string | yes      | New state. Colour depends on `t`.                           |
| `t`   | string | yes      | One of `buff` \| `nerf` \| `chg` \| `new` (see below)       |

`* old` is optional for ALL types. If present and non-empty it renders struck-through as the
"before". If omitted, only `neu` shows (the new state). Use omission for qualitative changes
(reworks, new sources, bug fixes) that have no clean number to strike through.

### `t` semantics (drives colour + badge)
| `t`    | colour of `neu` | badge | meaning                                  |
|--------|-----------------|-------|------------------------------------------|
| `buff` | green           | BUFF  | numerical/functional improvement         |
| `nerf` | red             | NERF  | numerical/functional reduction           |
| `chg`  | cyan            | CHG   | structural rework / rewording, no clear net direction |
| `new`  | amber→green     | NEW   | content did not exist before             |

For `buff`/`nerf`/`chg` both `old` and `neu` render: `<old> → <neu>`.
For `new` only `neu` renders (amber label, green text).

## Validation rules (enforced by `build.py`)
1. Top level must have `sections` (array, non-empty).
2. Every section needs `id` (unique, non-empty) and `title` and `rows` (array).
3. Every row needs `k` (non-empty), `neu` (non-empty), `t` ∈ {buff,nerf,chg,new}.
4. `old` is optional for every row type. When present and non-empty it renders struck-through as the "before"; when absent, only `neu` (the new state) renders. (No requirement that non-`new` rows carry `old` — qualitative changes legitimately omit it.)
5. `meta` is optional; if present it must be an object.

On violation, `build.py` prints the first failing path and exits non-zero. No html is written.

## Authoring tips
- Keep `k` short and stable (`Winter Orb`, `Doryani's Delusion`) so leagues can be diffed against each other later.
- Put the number/range in `old` and `neu` explicitly — that is what the differ shows.
- When a change is a rework with no clean before/after number, use `t:"chg"` and describe both sides in `old`/`neu`.
- New content with no prior state: `t:"new"`, `neu` only.
