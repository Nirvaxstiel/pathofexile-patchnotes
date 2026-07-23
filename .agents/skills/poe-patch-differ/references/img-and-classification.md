# Image sourcing + classification hierarchy

## Image sourcing (`img` field)
- Patch-note bodies embed `web.poecdn.com/...` image URLs inline — ascendancy trees, uniques,
  skill icons, keystones.
- Copy those URLs VERBATIM into the row's `img`. Do NOT invent URLs and do NOT hotlink from wikis.
- `web_extract` strips all images; the forum is Cloudflare-blocked to `curl`. The URL will NOT
  appear in extracted notes — the user must paste the real `web.poecdn.com` link, or you transcribe
  it from the live notes page. Fabricating an image URL breaks the objective/source-attributed
  standard.
- `img` may be a single string URL or an array of URLs (renders one `IMAGES` button → gallery
  lightbox with ‹ › nav, counter, keyboard).
- `img` is ROW-LEVEL ONLY. A section-level `img` key is silently ignored. Put `img` on the first
  row of a section (or every row that warrants it).

## Classification hierarchy (`pos` / `neg`)
Players weight effects by impact, not by naive "any buff ⇒ BUFF". A single change can help AND
hurt. Tags:

| tag | covers |
|-----|--------|
| `loot` | quantity / rarity / currency / drop rate / vendor |
| `combat` | damage / life / defense / cost / cooldown / monster stats |
| `other` | AI / UI / QoL / behaviour |

Resolution priority: **`loot` (3) > `combat` (2) > `other` (1)`**:
- both sides present → higher priority wins; tie → `chg`
- only `neg` → `nerf`; only `pos` → `buff`
- neither → fall back to manual `t`
- `t:"new"` is locked

Example: "No longer counts as party member" — combat penalty gone but item-quantity/rarity bonus
also gone → `neg:["loot"]` → resolves **NERF** (loot loss outranks absent combat). The naive
`old` text describes the change; the `neu` describes the resulting state. Keep `old` as the
*previous state*, not a restatement of the change.
