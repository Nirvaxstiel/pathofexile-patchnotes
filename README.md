# Path of Exile Patch Notes — Differ

A static site of colour-coded **before → after** Path of Exile patch differs.
Each league is one JSON file; a single-page app renders any league's sections on demand.
No build step — `index.html` fetches the manifest and league JSON at runtime.

## TRANSPARENCY / DISCLAIMER

> **This is an LLM-assisted project.** The differs and documentation were produced and are
> maintained with the help of a large language model (an agent running the Hermes skill system).
> Patch *data* is transcribed from official Grinding Gear Games forum notes; the colour-coding,
> structure, and tooling are the authoring layer on top of that.
>
> **The skill we use is included here, as-is.** It lives under
> [`.agents/skills/poe-patch-differ/`](.agents/skills/poe-patch-differ/) as plain documentation
> (SKILL.md + references) — no build scripts, no templates. The data model is plain JSON.
>
- `index.html` is the **self-contained SPA shell** — edit it directly for style/behaviour.
- `leagues/index.json` is the **static manifest** (one line: `python -c "…write manifest…"`,
  or just edit it by hand when adding a league).
- The JSON under `leagues/<ver>/<ver>.json` is the **durable data** you author per league.
  The site fetches it at runtime and renders all sections in the side contents panel.
- **Favicon**: an inline SVG (palette diamond) is embedded in `index.html` — no asset file needed.
- **Images**: rows may carry an `img` field (official `web.poecdn.com` art URLs copied verbatim
  from the patch notes). An `IMG` button opens a lightbox with zoom / pan / flip / rotate.
- **Classification**: mixed-signal rows use `pos`/`neg` category tags (`loot` > `combat` > `other`)
  so the badge reflects player-weighted impact (see `schema.md`).
>
> **Not affiliated with Grinding Gear Games.** Patch text is sourced from official POE forum notes;
> all interpretation, colour-coding, and tooling are ours.

## Layout

```
Patchnotes/
├── index.html                  # self-contained SPA (fetches manifest + league JSON at runtime)
├── README.md                   # this file
├── .github/workflows/build.yml # deploys the static repo to Pages on push (no build step)
├── .agents/skills/
│   └── poe-patch-differ/       # skill as docs-only (SKILL.md + references/)
│       ├── SKILL.md
│       └── references/{schema,sourcing,img-and-classification,pitfalls}.md
└── leagues/
    ├── index.json              # static manifest [{version, league, json}]
    └── 3.29/
        └── 3.29.json           # authored data (source of truth for this league)
```

## How it works

`index.html` is a single-page app with **no build step**. On boot it fetches `leagues/index.json`,
populates the league selector, and opens the latest league. A searchable selector (sidebar) switches
leagues; the left contents panel lists the selected league's sections (collapsible `<details>`), each
expandable to its rows, with a live filter box. The right pane renders the differ (buffs green, nerfs
red, changes cyan, new amber). Each league is fetched as JSON on demand — no per-league HTML files.
Rows that carry an `img` field show an `IMG` button that opens a lightbox (zoom / pan / flip / rotate).
The page `<title>` tracks the selected league.

**Runtime fetch means `file://` is blocked.** Serve the folder (`python -m http.server` from repo root)
or deploy to GitHub/Forgejo Pages. Do not open `index.html` directly.

## Hosting (GitHub Pages / Codeberg Pages)

The site is static — no build, no compilation. On **GitHub**, `.github/workflows/build.yml` uploads
the whole repo as a Pages artifact on push (no Python build). On **Codeberg/Forgejo** the same repo
works unchanged — Codeberg Pages serves `https://<user>.codeberg.page/<repo>/` directly with no CI
file needed. Just push and enable Pages in repo settings.

## Per-league workflow

```bash
# 1. author leagues/<ver>/<ver>.json  (see .agents/skills/poe-patch-differ/references/schema.md)
# 2. add it to the manifest (hand-edit leagues/index.json, or regenerate):
python - <<'PY'
import json, glob, os
out=[]
for p in sorted(glob.glob("leagues/*/*.json")):
    if os.path.basename(p).lower()=="index.json": continue
    d=json.load(open(p,encoding="utf-8")); m=d.get("meta") or {}
    out.append({"version":m.get("version") or os.path.basename(os.path.dirname(p)),
                "league":m.get("league") or "(untitled)",
                "json":os.path.relpath(p,".").replace(os.sep,"/")})
out.sort(key=lambda x:x["version"], reverse=True)
json.dump(out, open("leagues/index.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
PY
# 3. commit + push — Pages deploys automatically
```

To restyle: edit `index.html`'s `<style>` block directly. No template/skill round-trip.

## Completeness check (audit a league against the forum)

After authoring a league, verify nothing was dropped from the official notes. The scanner lives in the
skill references as a recipe; the gist:

- Slice the cached forum notes (from `web_extract`) into real TOC sections.
- Report a **coverage % per section**; a whole missing section (0%) is obvious.
- Enforce that numeric values (ranges, percentages, `(was X)`) actually appear in the JSON —
  catches dropped numeric lists hidden behind a summary row.
- Flag any row whose text was truncated with `...`.

A finished league should sit at ~90%+. Remaining misses are mostly lore/flavour text and generic
footnotes that are correctly *not* rows — grep-confirm each before adding.
