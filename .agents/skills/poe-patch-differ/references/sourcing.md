# Sourcing the patch notes

## Where to pull from
- **Official forum thread** (`pathofexile.com/forum/view-thread/...`) — extracts cleanly via
  `web_extract`. The full notes body is saved to a cache `.md` even though the tool preview
  truncates the middle. Read the cache in chunks (it's ~108K chars but only ~67 newlines — the
  whole body is one or two giant lines).
- **poewiki** (`Version X.Y.Z`) — **Anubis bot-walled** via curl/web_extract. Do not rely on it.

## Cloudflare blocks curl
The live forum AND poewiki return a 5KB challenge page (or 4.6KB block) to `curl`. Do NOT try to
re-fetch art URLs headlessly — they won't resolve. Never fabricate `web.poecdn.com`/wiki URLs;
ask the user to paste the real image links.

## `web_extract` strips images
The cached markdown has zero `<img>`/poecdn URLs. Real art links only exist on the live notes page
(inline `web.poecdn.com/...`). When the user provides one, copy it verbatim into the row's `img`.

## Extraction recipe
1. `web_extract` the forum thread → cache `.md`.
2. Slice into sections: `re.finditer` over the full string; for each known TOC title pick the
   **largest-offset** occurrence (TOC copy sits near the top; real body is later). Split on
   `"Return to top"`.
3. For each section, write rows as `{k, old, neu, t}`. For reworks/bug fixes with no clean number,
   omit `old` (qualitative) rather than inventing a before-value.
4. Tag mixed-signal rows with `pos`/`neg`.
5. Tag every row with `version` (see schema.md) per the addendum date its `neu` reflects.

## Completeness audit
After authoring, verify against the forum cache:
- Per-section coverage % (a whole missing section = 0%, obvious).
- Numeric-token enforcement: a change fact with ≥2 distinct numbers (ranges, percentages,
  `(was X)`) is a HARD miss if none appear in the JSON. Catches dropped numeric lists hidden
  behind a summary row.
- Truncation detection: any row whose `neu`/`old` contains `"..."` needs expansion.
Expect ~90%+ on a finished league. Remaining misses are mostly lore/flavour text and generic
footnotes correctly NOT rows — grep-confirm each before adding.
