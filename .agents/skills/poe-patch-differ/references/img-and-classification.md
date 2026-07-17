# Images & Mixed-Signal Classification (poe-patch-differ)

## Image sourcing (the realistic path)
- `web_extract` of a POE forum thread returns **text only** — all `<img>` / poecdn URLs are gone.
- The live forum (`pathofexile.com/forum/view-thread/...`) and poewiki are both **Cloudflare-
  blocked to `curl`** (5KB challenge / 4.6KB block). Headless re-fetch of art URLs fails.
- Patch-note bodies embed art as inline `https://web.poecdn.com/public/news/<date>/<Name>.jpg`
  (e.g. `LeftReliqaurianAsendancy.jpg`). These URLs only surface on the rendered live page.
- **Rule:** the user pastes the real `web.poecdn.com` link → copy verbatim into the row's `img`.
  Never invent, never wiki-hotlink. Fabricated URLs violate the objective/source-attributed standard.

## Image UX (already in template)
- Row with `img` → `IMG` button (`class="imgbtn"`) → lightbox `#lightbox`.
- Controls: Zoom ± (buttons + wheel), pan (drag, pointer events), Flip H/V, Rotate L/R,
  Reset, Close. State held in `tf = {s,x,y,fh,fv,r}`; `applyTf()` composes
  `translate() rotate() scale(s*fh, s*fv)`.
- Click outside / `[data-act=close]` closes.

## Classification hierarchy (`pos` / `neg`)
Priority (high→low): `loot` (3) > `combat` (2) > `other` (1).
- `loot`  — item quantity, rarity, currency, drop rate, vendor/store.
- `combat` — damage dealt, life/ES, defenses, skill/stat cost, cooldown, monster dmg/life.
- `other` — AI, UI, QoL, monster behaviour, misc.

Resolution (`resolveClass` in `templates/patch.template.html`):
```
p = max priority in pos   (0 if absent)
n = max priority in neg   (0 if absent)
if p && n:  p>n -> buff ; n>p -> nerf ; else -> chg
elif n: nerf
elif p: buff
else:  null  (fall back to manual t)
```
Worked examples:
- `neg:["loot"]` only -> **NERF** ("no longer party member" removes qty/rarity bonus).
- `pos:["loot"], neg:["combat"]` -> **BUFF** (loot outranks combat).
- `pos:["loot"], neg:["loot"]` -> **CHG** (tie -> ambiguous, mark change).
- neither present -> use `t`.

Always tag mixed rows with `pos`/`neg`; reserve manual `t` for single-direction changes.
