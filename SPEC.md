# Dual Read — v1 spec

Personal desktop reader for English–Chinese bilingual books. No backend. The user imports two documents, reads them as aligned pairs, one pair at a time, in a zen two-column view.

This spec is the v1 contract. Later features (in-place pair editing, quote-anchored notes) constrain the v1 data model but are not in the v1 UI.

## 1. Product

| | |
| --- | --- |
| Audience | The author, as a personal tool |
| Languages | English (left) and Chinese (right). Fixed. |
| Platform | Desktop web. No mobile layout in v1. |
| Hosting | Client-only. Existing stack: SvelteKit + `@sveltejs/adapter-static`. |
| Persistence | IndexedDB on this browser. No accounts, no sync. |

**Job to be done:** open a book from a local library, see the current English paragraph and its Chinese counterpart, go to the next pair without chrome in the way.

## 2. Goals and non-goals

### v1 does

- Import a pair of `.txt` / `.md` / `.markdown` files
- Split them into 1:1 pairs and refuse the import when counts differ
- Keep many books in a local library
- Resume a book at the last pair
- Zen reading: only the current pair on screen
- Remember font size globally
- Follow the OS light/dark scheme

### v1 does not

Account/cloud sync, mobile layout, editing imported text, notes/highlights, search, table of contents, EPUB/PDF/Word, export/backup, TTS, pop-up translation, auto-alignment, bundled sample book, in-app theme switch, click-to-turn-page, page-turn animation.

### Later (no v1 UI; v1 schema must not paint us into a corner)

1. **Edit** — change the text of a pair; insert/delete **pairs** (one side may be temporarily empty). Not single-side inserts. Not re-export to the original files (v1 does not keep the original files).
2. **Notes** — highlight on either side, optional note text, anchored by selected quote (re-find / update offsets after edits). If the quote cannot be found, keep the note and mark it invalid. Notes hang on `pairId` + side. v1 has **no notes table**.

## 3. Information architecture

All chrome copy is English.

| Route | Role |
| --- | --- |
| `/` | Library. This is the site home. |
| `/import` | New book: title + English file + Chinese file |
| `/book/:id` | Zen reader for that book |

- Opening the site at `/` always shows the library, not the last book.
- Reloading `/book/:id` stays on that book at the stored pair.
- There is no import control inside zen. Leave to the library first.

SvelteKit is static: use SPA fallback (`adapter({ fallback: 'index.html' })`) and disable SSR for the app shell so `/book/:id` works with no server.

## 4. Data model

IndexedDB. Suggested object stores:

### `books`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (UUID) | Primary key |
| `title` | string | Set at import; user-editable metadata, not body text |
| `createdAt` | number | `Date.now()` |
| `openedAt` | number | Last time the reader was opened; library sort key |
| `pairCount` | number | Denormalized `N` for `n/N` |

Import always creates a **new** book. Importing the same files twice yields two books. There is no in-place replace. To change files: delete the book, import again.

### `pairs`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (UUID) | Stable identity for progress and future notes |
| `bookId` | string | |
| `order` | number | Reading sequence. v1 writes `0 .. n-1` at import. Later inserts may use fractional order or reindex; do not treat array index as identity. |
| `en` | string | English source of this block |
| `zh` | string | Chinese source of this block |

v1 import never writes an empty side (empty blocks are stripped first). The schema still **allows** `""` on one side so later pair-insert can land an empty side.

### `progress`

| Field | Type | Notes |
| --- | --- | --- |
| `bookId` | string | Primary key, one row per book |
| `pairId` | string | Current pair |

Display `n/N` as 1-based position of `pairId` in `order`. If `pairId` is missing (corrupt/deleted), snap to the first pair by `order`.

### `prefs`

Single record: `{ fontSize: number }` (px). Global, all books. Not per-book. Not theme — theme follows the OS.

### Not stored in v1

- Original file bytes or filenames (beyond the default title)
- Notes/highlights
- Per-book font size or column ratio

## 5. Import

### Entry

Library has **Import book**. That route is a full page (not a modal):

1. **Title** — defaults to the English filename without extension; user may edit (metadata, not body).
2. **English** drop/file slot (left).
3. **Chinese** drop/file slot (right).

Accept `.txt`, `.md`, `.markdown`. Drag-and-drop onto the labeled slot, or a file picker. Both slots required to submit. Cancel returns to the library.

Mixed types are allowed (txt + md) **if** the pair counts match after splitting.

### Pipeline

1. Read both files as UTF-8.
2. Detect type from extension (`.md` / `.markdown` → markdown; `.txt` → plain).
3. Split each file into blocks (section 6).
4. Drop empty blocks (whitespace-only after trim of leading/trailing blank lines).
5. If either side has 0 blocks, or the two lengths differ: **do not create a book**. Show a short error that includes both counts, e.g. `Cannot import: English has 12 passages, Chinese has 10. Counts must match.` No mismatch preview.
6. Zip by index into pairs. Assign each pair a UUID and `order = 0 .. n-1`.
7. Persist book, pairs, and progress at the first pair. Set `openedAt` to now.
8. Go to the library (not straight into zen).

## 6. Splitting

The 1:1 contract is on **blocks after empty-stripping**, not on raw file lines.

### Plain text

Split on blank lines (two or more newlines). A single newline inside a block is part of the same passage.

When **rendering** a txt passage, collapse internal newlines to spaces (hard-wrapped English dumps would otherwise show as eighty-column shards). Markdown paragraphs wrap normally; fenced code keeps newlines.

### Markdown

Split by **block**, not by blank lines:

| Block | One passage? |
| --- | --- |
| ATX/setext heading | Yes — a heading is its own pair page |
| Paragraph | Yes |
| List (tight or loose) | **The whole list** is one passage, not each item |
| Fenced code | Yes |
| Block quote | Yes |
| GFM table | Yes |
| YAML front matter | Drop; not a passage |
| Thematic break (`---`) | Skip; not a passage |

If a markdown file and a text file are paired, they still only import when the two block counts match. Mismatch is the user's problem to fix in the files.

## 7. Rendering

### Markdown

Render each passage independently.

- Inline: strong, emphasis, inline code, links **styled as links but not clickable** in v1.
- Blocks: headings, paragraphs, lists, blockquotes, fenced code, **tables**.
- No images. If an image node appears, show the alt text only (or omit the image); do not fail the whole import.

Use the existing Tailwind typography plugin for markdown passages.

### Plain text

Plain text, not parsed as markdown, so literal `*` survives. After collapsing internal newlines to spaces, wrap as normal prose.

### Overflow

- If the pair is taller than the viewport: **one shared vertical scroll** for both columns. Independent column scrolling is forbidden.
- If a table is wider than its column: **horizontal scroll inside that column only**. Vertical scroll stays shared.

## 8. Library

Always the `/` view.

Each row/card:

- Title
- Progress `n/N`
- Delete, with a confirm step

Sort: **most recently opened first** (`openedAt`). Do not show the timestamp.

Empty library: title/progress none; the import action is the empty state. No sample book.

Delete removes the book, its pairs, and its progress row.

## 9. Reader (zen)

### Layout

- Only the current pair is in the DOM (one pair on screen, no virtualized chapter).
- English left, Chinese right, **50/50**, not a draggable splitter.
- Each column has a max line length; the pair is centered in the window. Do not stretch columns to the full viewport width.
- System light/dark (`prefers-color-scheme`). No in-app theme toggle.
- System fonts, with `lang="en"` on the left column and `lang="zh-Hans"` on the right.
- Native text selection is allowed (comparison). Clicking the body does **not** turn the page.

### Chrome

Hidden until the pointer is near a window edge (top/bottom). Then:

- Title
- `n/N`
- Previous / Next
- Scrubbable progress (jump to any pair by position)
- `A+` / `A-` (global font size, persisted)
- Exit → library

No onboarding. No notes placeholder. No import.

### Movement

| Input | Action |
| --- | --- |
| `←` `j` | Previous pair |
| `→` `k` Space | Next pair |
| Shift+Space | Previous pair |
| Home | First pair |
| End | Last pair |
| Esc | Library |
| Hover Previous/Next | Same as keys |
| Hover progress slider | Jump to that pair; persist immediately |

At the first pair, Previous is disabled. At the last pair, Next is disabled. **No wrap.** Next on the last pair does not kick the user to the library.

Instant swap. No page-turn animation.

Opening a book from the library sets `openedAt` and restores `pairId`.

## 10. Future notes and edits (constraints only)

v1 does not implement these. Implementers must not invent a notes UI or an editor.

- Identity is `pairId`, never “the nth row of an array”.
- A note (later) is `{ pairId, side: "en" | "zh", quote, start?, end?, body? }`. `quote` is the selected source substring used to re-find the range after an edit; numeric offsets are a cache to be updated when the quote still matches.
- Highlights exist independently on each side.
- An empty `body` is a highlight with no comment.
- If the quote cannot be found after an edit: keep the row, mark `invalid`, stop painting the highlight.
- Later editing may insert/delete **pairs** (both sides; a side may be `""`). That reorders `order` but must not reshuffle existing `pairId`s. Progress stored as `pairId` stays on the same pair.
- Later editing of passage text cannot round-trip to the original markdown/text file. The stored `en` / `zh` strings **are** the source of truth.

## 11. Technical notes (this repo)

- TypeScript, Svelte 5 runes, Tailwind v4, `@tailwindcss/typography`.
- `adapter-static` with SPA fallback; `ssr = false` is expected for a client-only IndexedDB app.
- All product strings in English (see `AGENTS.md`).
- UUID: `crypto.randomUUID()`.
- Font size: persist a px value; clamp to a sensible range (e.g. 16–28) in the hover chrome.

## 12. Acceptance

v1 is done when:

1. An empty library can import two UTF-8 files and list a book with title and `1/N`.
2. Unequal block counts (or 0) never create a book and the error includes both counts.
3. Markdown headings are their own pages; a list is one page; tables render; images do not break import.
4. Txt + markdown imports succeed when counts match.
5. Reloading the browser keeps books and the current pair.
6. Reloading `/book/:id` does not dump the user on `/`.
7. The reader shows one pair, 50/50, English left; keyboard and slider move; ends do not wrap; body click does not turn the page; text is selectable.
8. Delete with confirm removes the book.
9. Dark/light follows the OS; font size survives reload and applies to every book.
10. There is no path in the UI to edit text, add a note, search, or open a TOC.
