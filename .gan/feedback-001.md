# Feedback 001 — Final gate (SPEC.md §12)

**Pass:** yes
**Weighted:** 8.8
**Functionality:** 9/10
**Zen craft:** 9/10
**Design quality:** 8/10

## Automatic fails

- none

## §12 / sprint contract

| Item | Pass? | Evidence |
| --- | --- | --- |
| 1. Empty library imports two UTF-8 files; list shows title and `1/N` | yes | Imported `en.txt`/`zh.txt` as “Plain pair”; landed on `/`; row `Plain pair 1/3` |
| 2. Unequal or 0 counts never create a book; error includes both counts | yes | Mismatch: `Cannot import: English has 3 passages, Chinese has 2. Counts must match.` stayed on `/import`, still one book. Empty English: `English has 0 passages, Chinese has 3` |
| 3. MD headings own pages; list is one page; tables render; images do not break import | yes | Heading pair is `<h1>Chapter one</h1>`. List pair `3/9` is one `<ul>` with alpha and beta. Table pair has `<table>` inside `.table-wrap` with `overflow-x: auto`. Image pair shows alt `a cat`, `img` count 0 |
| 4. Txt + markdown imports when counts match | yes | `en.md` + `zh-from-md.txt` created “Mixed” `1/9`; listed newest first |
| 5. Reload keeps books and the current pair | yes | After slider to `4/9`, reload kept that pair; library still showed both titles |
| 6. Reload `/book/:id` does not dump to `/` | yes | Reloaded `http://127.0.0.1:5177/book/<id>` stayed on that URL. Production preview `/book/test-id` HTTP 200 via SPA fallback |
| 7. One pair, 50/50, EN left; keys + slider; no wrap; body click does not turn; selectable | yes | One `[data-pair-id]`; langs `en` / `zh-Hans`; widths 332/332; shared scroller `overflow-y: auto`, columns `visible`. Keys and slider moved. End + Next stayed `9/9` in the reader. Body click kept the same `pairId`. Selection non-empty |
| 8. Delete with confirm removes the book | yes | Cancel left 2 books. Confirm removed “Plain pair”; gone after reload; “Mixed” remained |
| 9. OS light/dark; font size survives reload and applies to every book | yes | `A+` `18px` → `20px`, reload `20px`, other book `20px`. `prefers-color-scheme: dark` body `rgb(18,18,18)` on white text; light white on black |
| 10. No edit / note / search / TOC in the UI | yes | Zen copy hunt: no note, search, contents, theme, import book, or `\bedit\b` |

Extra gate checks (not numbered in §12, required by the evaluator script): empty library is only Import book (no sample); Cancel from import returns to `/`; chrome hidden until the pointer is near an edge; Esc returns to the library; no wrap at the first pair.

Unit tests: 36 passed. Production `adapter-static` fallback serves `/`, `/import`, `/book/:id` as HTTP 200.

## Must fix

- none

## Do not do

- Notes, search, TOC, in-place editing, theme toggle, sample book, click-to-turn, page-turn animation, mobile stacked reader, import inside zen
