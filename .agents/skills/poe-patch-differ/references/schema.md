# Schema — row & section fields

## Top level
```json
{
  "meta": { ... },
  "sections": [ ... ]
}
```

### `meta` (optional but recommended)
| key | meaning |
|-----|---------|
| `game` | e.g. "Path of Exile" |
| `version` | league version, e.g. "3.29.0" — used for the manifest + title |
| `league` | league name, e.g. "Curse of the Allflame" |
| `launch` | launch date (YYYY-MM-DD) |
| `posted` | notes posted date |
| `author` | GGG author handle |
| `source` | forum thread URL |

### `sections[]`
| key | meaning |
|-----|---------|
| `id` | slug, used as anchor (`#skills`) |
| `n` | display number (e.g. "14") — optional |
| `title` | section heading |
| `sub` | subtitle / scope note — optional |
| `rows` | array of row objects (leaf sections) |
| `sections` | nested sub-sections (branch sections) — omit `rows` if present |

A section is either a **leaf** (`rows`, no `sections`) or a **branch** (`sections`, no `rows`).

## Row object
| key | required | meaning |
|-----|----------|---------|
| `k` | yes | the change key (skill/gem/unique/mechanic name) |
| `old` | no | pre-patch value. Omit for `t:"new"` or qualitative changes. |
| `neu` | yes | post-patch value |
| `t` | no | `buff` \| `nerf` \| `chg` \| `new`. Falls back to `chg`. |
| `pos` | no | category tags that help: `["loot"]`, `["combat"]`, `["other"]` |
| `neg` | no | category tags that hurt (same vocabulary) |
| `img` | no | string URL or array of URLs (official `web.poecdn.com` art) |
| `version` | no | addendum date: `"2026-07-16"` / `"2026-07-17"` / `"2026-07-22"` |

## Classification (`pos` / `neg`)
Priority: `loot` (3) > `combat` (2) > `other` (1).
- Both sides present → higher priority wins; tie → `chg`.
- Only `neg` → `nerf`. Only `pos` → `buff`.
- Neither → fall back to manual `t`.
- `t:"new"` is locked — `resolveClass` never overrides it.

If a row is mixed-signal, prefer `pos`/`neg` over a manual `t` so the badge reflects
player-weighted impact (e.g. "no longer counts as party member" → `neg:["loot"]` → NERF).

## `version` — addendum tracking
GGG mutates the original notes post and appends "Updates for <date>" spoilers. Tag every row with
the date its current `neu` reflects:
- `"2026-07-16"` — original notes (the T-0 value)
- `"2026-07-17"` — first update
- `"2026-07-22"` — latest update

The site derives Version History + badges from these fields. No reconstruction needed — the update
sections in the notes tell you exactly which rows changed and to what.
