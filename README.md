# POE Patch Differ — Repo

A static site of colour-coded **before → after** Path of Exile patch differs.
Each league is one JSON file; a single-page app renders any league's sections on demand.
Hosted on GitHub Pages / Forgejo Pages (auto-built by `.github/workflows/build.yml`).

## TRANSPARENCY / DISCLAIMER

> **This is an LLM-assisted project.** The differs, the generator, and the documentation in this
> repo were produced and are maintained with the help of a large language model (an agent running
> the Hermes skill system). Patch *data* is transcribed from official Grinding Gear Games forum
> notes; the colour-coding, structure, and tooling are our own authoring layer on top of that.
>
> **The skill we use is included here, as-is.** It lives under
> [`.agents/skills/poe-patch-differ/`](.agents/skills/poe-patch-differ/) — the same skill the agent
> runs. You are free to **copy it, fork it, or replicate it yourself**; nothing here is secret or
> proprietary. The data model and build scripts are plain JSON + Python and need no special runtime.
>
> - `index.html` (the SPA shell) and `leagues/index.json` (manifest) are **build outputs** — do not
>   hand-edit them; edit the skill's `templates/patch.template.html` and rebuild.
> - The JSON under `leagues/<ver>/<ver>.json` is the **durable data** you author per league.
>   The site fetches it at runtime and renders all sections in the side contents panel.
> - `.agents/skills/` here is a **snapshot** of the agent's skill directory. The canonical copy
>   lives in the agent's skill store; when the skill is updated we re-copy it in. If they drift,
>   re-copy from the skill.
>
> **Not affiliated with Grinding Gear Games.** Patch text is sourced from official POE forum notes;
> all interpretation, colour-coding, and tooling are ours.

## Layout

```
Patchnotes/
├── index.html                      # SPA shell (league selector + collapsible contents panel)
├── README.md                       # this file
├── .github/workflows/build.yml     # rebuilds + deploys to Pages on push
├── .agents/skills/
│   └── poe-patch-differ/           # the skill we use (mirror; re-sync on update)
│       ├── SKILL.md
│       ├── references/{schema,sourcing}.md
│       ├── templates/patch.template.html
│       └── scripts/build_site.py
└── leagues/
    ├── index.json                  # manifest (build output)
    └── 3.29/
        └── 3.29.json               # authored data (source of truth for this league)
```

## How it works

`index.html` is a single-page app. A league `<select>` switches leagues; the left **contents
panel** lists the selected league's sections (collapsible `<details>`), each expandable to its
rows, with a live **filter box** that narrows sections + rows. The right pane renders the differ
(buffs green, nerfs red, changes cyan, new amber). Each league is fetched as JSON on demand — no
per-league HTML files.

## Per-league workflow

```bash
# 1. author leagues/<ver>/<ver>.json  (see .agents/skills/poe-patch-differ/references/schema.md)
# 2. build the site (writes leagues/index.json + index.html)
python .agents/skills/poe-patch-differ/scripts/build_site.py --root .
```

To add a league: drop `leagues/<ver>/<ver>.json`, run `build_site.py`. On push, the workflow
rebuilds and redeploys to Pages.

## Sync the skill in

Whenever the agent's skill changes, copy it in:

```bash
cp -r ~/.hermes/skills/poe-patch-differ/. .agents/skills/poe-patch-differ/
python .agents/skills/poe-patch-differ/scripts/build_site.py --root .
```
