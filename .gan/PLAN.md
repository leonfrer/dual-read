# Dual Read — GAN sprint plan

Product contract: [`SPEC.md`](../SPEC.md). This file does not add features.

Harness: skip planner expansion. Generator implements one sprint at a time. Evaluator tests the live app (and unit tests where this plan requires them). Do not start the next sprint until the current sprint contract passes.

```
GAN_SKIP_PLANNER=true
GAN_EVAL_MODE=playwright
GAN_DEV_SERVER_CMD=npm run dev
GAN_PASS_THRESHOLD=7.0
GAN_MAX_ITERATIONS=5          # per sprint
```

After Sprint 6, run a full §12 evaluation (no new work unless the evaluator files failures).

## Rules for every sprint

- Follow `SPEC.md`. v1 non-goals are automatic fails, not later tickets.
- UI copy, comments, commits, identifiers: English. Book content may be Chinese.
- Svelte 5 runes, TypeScript strict, Tailwind v4, `@tailwindcss/typography`.
- When creating or editing `.svelte` files, use the Svelte MCP tools / `svelte-file-editor` subagent and `svelte-core-bestpractices`.
- Commit only if the human asks.
- Test fixtures live under `src/lib/**/fixtures` or `e2e/fixtures`. Never seed a sample book into IndexedDB or the library UI.
- Identity is `pairId` (UUID from `crypto.randomUUID()`). Never treat array index as identity.
- Schema may store `""` on one side. v1 import must not write empty sides (empty blocks are stripped first).

## Sprint graph

```
S1 shell
  └─ S2 persistence
       └─ S3 split + import pipeline
            └─ S4 library + import UI
                 ├─ S5 zen pair view
                 └─ S6 zen chrome, movement, prefs
                      └─ Gate: SPEC.md §12
```

S5 and S6 are sequential: S6 chrome sits on the S5 pair view.

---

## Sprint 1 — Static SPA shell

**Why first:** `/book/:id` must survive reload on a client-only static host.

### Implement

- `adapter({ fallback: 'index.html' })` (today `vite.config.ts` calls `adapter()` with no fallback).
- App-wide `ssr = false` (root `+layout.ts` or equivalent).
- Routes (stubs are enough; no IndexedDB yet):
  - `/` library placeholder
  - `/import` import placeholder
  - `/book/[id]` reader placeholder
- Replace the SvelteKit welcome page.
- Root document `lang="en"`.
- Color scheme follows `prefers-color-scheme` (no in-app theme toggle).
- Desktop-only composition. Do not add a mobile layout.

### Done when

- Production build (`npm run build`) emits a fallback `index.html`.
- Visiting `/`, `/import`, and `/book/any-id` in the static preview (or `vite dev` with SPA client routing) does not 404.
- Reloading `/book/any-id` stays on that URL (placeholder content is OK).
- `/` is the library, not a last-opened book.

### Evaluator

- Open `/`, `/import`, `/book/test-id`. Reload `/book/test-id`. Confirm URL and placeholder, not a dump to `/` or a 404.
- Confirm there is no theme switcher.

### Out of scope

IndexedDB, file import, real reading.

---

## Sprint 2 — Persistence

**Why:** Library, import, and resume all share one schema. Later notes/edits need stable `pairId`s now.

### Implement

IndexedDB (Dexie or `idb`) with stores matching `SPEC.md` §4:

| Store | Key | Required fields |
| --- | --- | --- |
| `books` | `id` | `title`, `createdAt`, `openedAt`, `pairCount` |
| `pairs` | `id` | `bookId`, `order`, `en`, `zh` |
| `progress` | `bookId` | `pairId` |
| `prefs` | single record | `fontSize` (px) |

API the UI will call (names flexible):

- Create book + pairs + progress at the first pair (`order` 0). Set `openedAt` to now. Import always inserts a new book.
- List books sorted by `openedAt` descending.
- Get book, get pairs by `bookId` ordered by `order`, get/set progress by `pairId`.
- If stored `pairId` is missing, snap to the first pair by `order`.
- Delete book: remove book, its pairs, and its progress row.
- Get/set global `fontSize`, clamp 16–28.

Do not store original file bytes or filenames (title string is enough).

### Done when

- Types match the spec fields.
- Create / list / resume / delete can be exercised (unit test with fake IndexedDB, or a temporary debug path that S4 will remove).
- Two creates of the same logical files yield two books.

### Evaluator

- Code review against §4.
- If tests exist, run them. If only a debug path exists, create two books, delete one, reload, confirm the other remains.

### Out of scope

Import UI, splitters, reader chrome.

---

## Sprint 3 — Split + import pipeline

**Why:** This is the v1 domain core. Keep it UI-free so it is testable.

### Implement

Pure functions covering `SPEC.md` §5–6:

1. Read UTF-8 (the file-reading glue may live next to the functions).
2. Type from extension: `.md` / `.markdown` → markdown; `.txt` → plain. Mixed types allowed.
3. Split to blocks.
4. Drop empty blocks (whitespace-only after trim of leading/trailing blank lines).
5. If either side has 0 blocks, or lengths differ: throw/return a structured error. Message must include both counts, e.g. `Cannot import: English has 12 passages, Chinese has 10. Counts must match.` No mismatch preview.
6. Zip by index. Each pair: new UUID, `order = 0 .. n-1`, both sides non-empty.
7. Persist via Sprint 2. Progress at the first pair. `openedAt` now.

**Plain text:** split on blank lines (two or more newlines). A single newline stays inside the block. Rendering (S5) collapses internal newlines to spaces; the stored string may keep them.

**Markdown blocks** (one passage each unless noted):

| Block | Passage? |
| --- | --- |
| ATX / setext heading | Yes, own page |
| Paragraph | Yes |
| List (tight or loose) | Whole list = one passage |
| Fenced code | Yes |
| Block quote | Yes |
| GFM table | Yes |
| YAML front matter | Drop |
| Thematic break (`---`) | Skip |
| Image | Must not fail the pipeline; rendering is S5 |

Add Vitest (or equivalent) and fixtures. Do not ship those fixtures as an in-app sample book.

### Done when tests prove

- Matching txt + txt imports (counts equal).
- Matching txt + markdown.
- Mismatch and 0-block sides do not persist a book; error includes both counts.
- Heading = own block; list = one block; YAML and `---` are not blocks.
- Image nodes do not throw.

### Evaluator

- Run the unit tests. Do not pass this sprint on UI screenshots.
- Read the error string. It must include both counts.

### Out of scope

Import page layout, library cards, markdown HTML rendering.

---

## Sprint 4 — Library + import UI

**Why:** First complete user loop: empty library → import → listed book → delete.

### Implement

**`/` library (`SPEC.md` §8)**

- Empty: no fake titles; Import book is the empty state. No sample book.
- Each book: title, progress `n/N` (1-based position of `pairId` in `order`), Delete with confirm.
- Sort: most recently opened first. Do not show timestamps.
- Opening a book sets `openedAt` and goes to `/book/:id`.
- Delete removes book, pairs, progress.
- Import book → `/import`.
- Site home is always the library, never the last book.

**`/import` (`SPEC.md` §5)**

- Full page, not a modal.
- Title: defaults to English filename without extension; user may edit.
- English slot left, Chinese slot right.
- Accept `.txt`, `.md`, `.markdown`. Drag-and-drop on the labeled slot, or file picker.
- Both slots required to submit.
- Cancel → library.
- On success: persist, then library (not zen).
- On mismatch/empty: no book created; show the pipeline error.

No import control inside zen (zen does not exist yet; do not add one later).

### Done when (`SPEC.md` §12 items 1, 2, 4, 8)

- Empty library imports two UTF-8 files and lists a book with title and `1/N`.
- Unequal counts / 0 blocks never create a book; error includes both counts.
- Txt + markdown succeeds when counts match.
- Delete with confirm removes the book (gone after reload).

### Evaluator (live)

1. Empty `/` → Import book → `/import` → Cancel → `/`.
2. Import matching txt + txt. Land on `/`. Row shows title and `1/N`.
3. Import mismatch. No new row. Error has both counts.
4. Import txt + md with equal counts. Second book appears. Sort: newest first.
5. Delete with confirm. Book gone. Reload: still gone. Dismissing confirm keeps the book.
6. Reload `/`: books remain.

### Out of scope

Reader layout, keyboard, font size chrome.

---

## Sprint 5 — Zen pair view

**Why:** The job to be done is one English paragraph and its Chinese counterpart, nothing else.

### Implement (`SPEC.md` §7 and §9 layout)

- Only the current pair is in the DOM.
- English left (`lang="en"`), Chinese right (`lang="zh-Hans"`), 50/50, not a draggable splitter.
- Each column has a max line length; the pair is centered. Do not stretch to full viewport width.
- System fonts. Native selection allowed. Body click does **not** turn the page.
- **Markdown:** render each passage independently via typography plugin. Inline: strong, emphasis, inline code, links styled as links but **not clickable**. Blocks: headings, paragraphs, lists, blockquotes, fenced code, tables. Images: alt text or omit; do not fail.
- **Plain text:** not parsed as markdown (literal `*` survives). Collapse internal newlines to spaces, then wrap as prose.
- Overflow: one shared vertical scroll for both columns. Independent column scrolling forbidden. Wide tables: horizontal scroll inside that column only; vertical scroll stays shared.
- Opening from the library restores `pairId` (movement chrome is S6; showing the stored pair is required here).

Placeholder chrome (title / n/N) may exist so S6 has a mount point, but do not build the full hover system yet if it blocks layout. A static title is acceptable.

### Done when (`SPEC.md` §12 items 3, 6, 7 layout)

- Heading passages render as their own pages; a list is one page; tables render; images did not break import.
- Reload `/book/:id` stays on that book at the stored pair (even if next/prev are not wired).
- One pair, 50/50, English left. Body click does not change pair. Text is selectable.

### Evaluator (live)

- Import a markdown fixture with heading, list, table, image. Step through enough pairs (temporary next control allowed if S6 is not done; remove if it is click-to-turn on the body).
- Confirm list items are one pair, heading is its own pair, table is visible, image does not crash.
- Confirm shared vertical scroll (not two independent columns).
- Select text. Click body. Pair must not change.
- Reload the reader URL.

### Out of scope

Hover-edge chrome, keyboard map, slider, `A+`/`A-`, page-turn animation (forbidden forever).

---

## Sprint 6 — Chrome, movement, prefs

**Why:** Move without chrome in the way, then recover chrome at the edges.

### Implement (`SPEC.md` §9)

**Chrome:** hidden until the pointer is near a window edge (top or bottom). Then:

- Title
- `n/N`
- Previous / Next
- Scrubbable progress (jump to any pair by position)
- `A+` / `A-` (global font size, persisted, clamp 16–28)
- Exit → library

No onboarding, notes placeholder, or import in zen.

**Movement** (instant swap, no animation, no wrap):

| Input | Action |
| --- | --- |
| `←` `j` | Previous |
| `→` `k` Space | Next |
| Shift+Space | Previous |
| Home | First |
| End | Last |
| Esc | Library |
| Previous/Next controls | Same as keys |
| Progress slider | Jump; persist immediately |

First pair: Previous disabled. Last pair: Next disabled. Next on last pair does not go to the library.

Opening a book from the library sets `openedAt` and restores `pairId`. Slider and keys persist `progress.pairId` immediately.

Font size is global across books, not per-book. Theme still follows the OS only.

### Done when (`SPEC.md` §12 items 5, 7, 9, 10)

- Reload keeps books and the current pair.
- Keyboard and slider move; ends do not wrap; body click does not turn the page; text is selectable.
- Dark/light follows OS; font size survives reload and applies to every book.
- No UI path to edit text, add a note, search, or open a TOC.

### Evaluator (live)

Exercise the table above, including Home/End, Shift+Space, Esc, disabled ends, slider persist + reload, font size on book A then book B, OS scheme (or `prefers-color-scheme` emulation), and a hunt for forbidden chrome (edit, notes, search, TOC, theme toggle, import-in-zen).

---

## Final gate — SPEC.md §12

No new features. Evaluator runs all ten acceptance items plus the non-goal hunt. Generator only fixes failures.

| # | Item |
| --- | --- |
| 1 | Empty library imports two UTF-8 files; list shows title and `1/N` |
| 2 | Unequal or 0 counts never create a book; error includes both counts |
| 3 | MD headings own pages; list is one page; tables render; images do not break import |
| 4 | Txt + markdown imports when counts match |
| 5 | Reload keeps books and current pair |
| 6 | Reload `/book/:id` does not dump to `/` |
| 7 | One pair, 50/50, EN left; keys + slider; no wrap; body click does not turn; selectable |
| 8 | Delete with confirm removes the book |
| 9 | OS light/dark; font size survives reload and applies to every book |
| 10 | No edit / note / search / TOC in the UI |

---

## Explicitly never

Account/cloud sync, mobile layout, editing imported text, notes/highlights, search, TOC, EPUB/PDF/Word, export/backup, TTS, pop-up translation, auto-alignment, bundled sample book, in-app theme switch, click-to-turn-page, page-turn animation.

Do not invent a notes table. Do not keep original files.
