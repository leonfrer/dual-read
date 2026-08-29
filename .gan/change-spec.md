# CHANGE SPEC: Remove pair-step Previous / Next

## 1. Title and job

**Title:** Remove zen pair-step (Previous / Next and sibling keys)

**Job:** Cut the only user-facing origins of the Chrome pair-step highlight flash: the Previous and Next chrome controls, and the keyboard pair-step that called the same `go()` path (`←` `j`, `→` `k`, Space, Shift+Space). Update `SPEC.md` so v1 no longer requires them. This is a removal. Do not fix `ignoreSpy`. Do not add a replacement stepper.

**Why:** Pair-step `go()` smooth-scrolls a neighbor onto the reading band; Chrome then flashes because `ignoreSpy` unlocks ~2px short of target. That flash is too hard to fix. Wheel, click, hairline, Home, End, and Esc are separate and stay.

---

## 2. In-scope removals

Remove **pair-step** only: one-pair-at-a-time previous/next, from chrome, keys, spec, types, tests, and dead derived state.

### Chrome (`ReaderView.svelte`)

Delete both controls and nothing else in the chrome row:

```svelte
<button class="quiet-action" type="button" disabled={atFirst} onclick={() => go(index - 1, 'key')}>
  Previous
</button>
<button class="quiet-action" type="button" disabled={atLast} onclick={() => go(index + 1, 'key')}>
  Next
</button>
```

Leave the row as: **title** (flex-1 truncate) · **`n/N`** · **A-** · **A+** · **Exit**. Same classes, same order, no spacer, no new control.

### Keyboard

Stop mapping and capturing:

| Key | Current | After |
| --- | --- | --- |
| `ArrowLeft`, `j` | `'prev'` + `preventDefault` + `go(index - 1, 'key')` | no movement; do not `preventDefault` |
| `ArrowRight`, `k` | `'next'` + same | no movement; do not `preventDefault` |
| Space (`key === ' '` or `code === 'Space'`) | `'next'` + `preventDefault` | **must not be captured**; native scroll is OK if the browser would scroll |
| Shift+Space | `'prev'` + `preventDefault` | same as Space: do not capture |

Delete the `onkeydown` tail that pair-steps:

```ts
void go(index + (movement === 'next' ? 1 : -1), 'key');
```

After `exit` / `first` / `last`, there is no remaining branch.

### Types / mapper (`movement.ts`)

- `Movement`: `'prev' | 'next' | 'first' | 'last' | 'exit'` → `'first' | 'last' | 'exit'`
- Delete the `ArrowLeft` / `j` / `ArrowRight` / `k` / Space / Shift+Space branches
- Drop `code?` from `KeyLike` (it existed only for Space)
- Drop `shiftKey` from `KeyLike` (it existed only for Shift+Space)

Keep the meta/ctrl/alt early return; it still guards Home / End / Esc.

### Dead derived / locals (`ReaderView.svelte`)

Delete:

```ts
let atFirst = $derived(index <= 0);
let atLast = $derived(index >= pairs.length - 1);
```

They exist only to disable Previous / Next.

Do **not** rename unrelated locals named `next` (`spy`, `go`, `bumpFont`, `chromeDock`, pointer index). Those are not pair-step.

### Tests (`movement.test.ts`)

- Stop asserting `'prev'` / `'next'` for arrows, `j`/`k`, Space, Shift+Space
- Assert those keys return `null`
- Keep Home / End / Escape → `'first'` / `'last'` / `'exit'`
- Rewrite the modifier examples: `k`+meta and `j`+ctrl always return `null` after this cut, so they no longer prove the guard. Use **Home / End / Escape** with meta/ctrl/alt instead
- Drop `shiftKey` / `code` from the `key()` helper if `KeyLike` no longer has them

### Spec copy (`SPEC.md`)

Delete or rewrite every Previous / Next / pair-step / “ends do not wrap” contract line listed in §4. Do not leave a dangling “same as keys” row.

### Completeness grep (after the cut)

In `SPEC.md` and `src/lib/reader/`, product language **Previous** / **Next** and movement `'prev'` / `'next'` must be gone.

Allowed leftovers (do not touch):

- Markdown/txt **wrap** (prose wrapping, `.table-wrap`)
- Unrelated identifiers `next` (next index, next font size, next dock)
- README `npm run preview`

---

## 3. Out of scope (must stay)

Do not expand v1. Do not “while we’re here.”

| Stays | Why |
| --- | --- |
| Home / End | First / last pair on the reading band via `go(0 \| length-1, 'key')` |
| Esc and chrome **Exit** | Library |
| Click a pair (no drag) | Focus + smooth `go(..., 'click')` |
| Pointer drag | Select text only |
| Wheel / trackpad spy | Document scroll; pair on the band becomes current; `ignoreSpy` still blocks programmatic intermediates |
| Progress hairline | Snap `go(..., 'scrub')`; persist; hover `n/N` |
| `go()`, `waitForScrollEnd`, `ignoreSpy`, `goToken` | Still used by Home / End / click / hairline / restore |
| `origin: 'key' \| 'click' \| 'scrub'` | `'key'` remains for Home / End. Do not rename |
| `go()` bounds `if (next < 0 \|\| next >= pairs.length) return` | Defensive; **not** a wrap feature. Do not rewrite, comment, or test it as wrap |
| A- / A+ / Exit | Chrome remainder |
| `.quiet-action` and `:disabled` | Still used by A- / A+ (and library/import) |
| `chromeDock`, edge reveal, hairline above bottom chrome | Unchanged |
| Reading band, dim/current lighting, chapter layout | Unchanged |
| Flash / `ignoreSpy` ~2px short | **Do not fix.** Home / End may still flash; that is not this change |
| Native arrow behavior if the hairline `<input type="range">` is focused | That is the scrubber, not pair-step. Do not add global `preventDefault` on arrows to “protect” it |
| `tabindex` on the scroller so Space scrolls | Do not add. Space must not be captured; native scroll is optional |
| Wrap-around, page-turn, slider-in-chrome, TOC, second mode | Non-goals |

If wrap existed only so Previous / Next would not cycle or kick to the library, **delete that contract**. Do not replace it with a new wrap story for Home / End.

---

## 4. Exact `SPEC.md` edits

### 4.1 Chrome list — delete one bullet

**Current** (§9 Chrome):

```
Hidden until the pointer is near a window edge (top/bottom). Then:

- Title
- `n/N`
- Previous / Next
- `A+` / `A-` (global font size, persisted; applies to passage text only)
- Exit → library
```

**After:** delete the line `- Previous / Next`. Leave the other four bullets in the same order. Do not reshuffle `A+` / `A-` to match the DOM (`A-` then `A+`); that mismatch is pre-existing and out of scope.

### 4.2 Movement table — delete four rows

Delete these rows entirely:

- `` `←` `j` ``
- `` `→` `k` Space ``
- `Shift+Space`
- `Hover Previous/Next`

Keep Home, End, Esc, Wheel / trackpad, Click, Drag, Progress hairline, with the same action text.

Do not add a row that says arrows/jk/Space do nothing. Silence in the table is the contract; tests and the rubric cover the negative.

### 4.3 Wrap paragraph — delete entirely

**Current** (immediately under the table):

```
At the first pair, Previous is disabled. At the last pair, Next is disabled. **No wrap.** Next on the last pair does not kick the user to the library.
```

**After:** gone. That paragraph is only about the pair-step buttons. Do not rewrite it for Home / End.

Keep the following paragraph unchanged:

```
No page-turn or slide animation. Focus opacity ~150–200ms; keyboard and click scrolling is `smooth`. `prefers-reduced-motion: reduce` makes both instant. Hairline scrubbing snaps without a smooth scroll.
```

“Keyboard” here still means Home / End (and Esc, which does not scroll).

### 4.4 Acceptance item 7 — rewrite movement clause; drop wrap

**Current:**

```
7. The reader shows a two-column chapter, English left; the current pair is lit and other pairs are dim; keyboard, click, wheel, and the progress hairline move; ends do not wrap; a drag selects text without changing pair; a click without a drag focuses that pair.
```

**After:**

```
7. The reader shows a two-column chapter, English left; the current pair is lit and other pairs are dim; Home, End, click, wheel, and the progress hairline move; a drag selects text without changing pair; a click without a drag focuses that pair.
```

### 4.5 Do not edit

- Job to be done (“move without chrome in the way”)
- §2 goals / non-goals
- §7 overflow wrap / §6 “wrap normally” (prose, not pair-step)
- Focus, hairline, layout, library, import, data model

After edits, `SPEC.md` must not contain the product words `Previous` or `Next`.

---

## 5. Implementation files — after state

Only these four files. No CSS file, no `focus.ts`, no route files.

### `SPEC.md`

As §4. Chrome list has no Previous / Next. Movement table has no pair-step rows. Wrap paragraph gone. Acceptance 7 names Home, End, click, wheel, hairline — not wrap, not Previous / Next.

### `src/lib/reader/movement.ts`

```ts
export type Movement = 'first' | 'last' | 'exit';

export const CHROME_EDGE_PX = 64;

export type KeyLike = {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	altKey: boolean;
};

export function movementFromKeyboard(event: KeyLike): Movement | null {
	if (event.metaKey || event.ctrlKey || event.altKey) {
		return null;
	}

	if (event.key === 'Escape') {
		return 'exit';
	}

	if (event.key === 'Home') {
		return 'first';
	}

	if (event.key === 'End') {
		return 'last';
	}

	return null;
}

// chromeDock unchanged
```

No `'prev'` / `'next'`. No Space. No arrows. No `j`/`k`. `chromeDock` untouched.

### `src/lib/reader/movement.test.ts`

- `maps the spec keys`: Home → `first`, End → `last`, Escape → `exit` only
- `former pair-step keys do nothing`: `ArrowLeft`, `j`, `ArrowRight`, `k`, `' '` → `null`
- `ignores modified keys and unknown keys`: meta/ctrl/alt on **Home or Escape** → `null`; still `J` and `e` → `null`
- `chromeDock` describe block unchanged
- `key()` helper matches `KeyLike` (no `shiftKey`, no `code`)

### `src/lib/reader/ReaderView.svelte`

**Script**

- Keep `import { chromeDock, movementFromKeyboard } from './movement'`
- Delete `atFirst` / `atLast`
- Keep `go(next, origin)` exactly, including origin `'key'`
- `onkeydown`: if no movement, return (no `preventDefault`). If movement, `preventDefault`, then `exit` → library, `first` → `go(0, 'key')`, else `go(pairs.length - 1, 'key')` (`last` is the only remaining case). No `movement === 'next'` ternary

**Chrome markup**

```svelte
<div class="mx-auto flex max-w-[67rem] flex-wrap items-center gap-x-5 gap-y-2">
	<p class="min-w-0 flex-1 truncate font-medium text-current">{book.title}</p>
	<p class="shrink-0 text-current/70 tabular-nums" data-progress-label>
		{position}/{book.pairCount}
	</p>
	<!-- A- , A+ , Exit unchanged -->
</div>
```

Title still `flex-1` so A-/A+/Exit stay a right-hand cluster. That is what keeps the quieter chrome balanced. Do not center the remaining controls. Do not add a gap filler.

**Unchanged:** scroller, spy, click/drag, hairline, lighting, styles.

**Craft:** run Svelte autofixer on this file until clean. `npm test` and `npm run check` pass. No unused vars.

### Sequencing

1. `SPEC.md` (contract first)
2. `movement.ts` + `movement.test.ts`
3. `ReaderView.svelte`
4. Autofixer, `vitest`, `svelte-check`
5. Grep leftovers

---

## 6. Behavior after

| Input | Behavior |
| --- | --- |
| Previous / Next | Not in the DOM. Not in the spec |
| `←` `→` `j` `k` | Do **not** pair-step. Do **not** `preventDefault` |
| Space / Shift+Space | Do **not** pair-step. Do **not** `preventDefault`. If the browser scrolls the chapter, that is OK. If Space does nothing because the scroller is an unfocused overflow `div`, that is also OK |
| Home | First pair on the reading band; persist |
| End | Last pair on the reading band; persist |
| Esc | Library |
| Click pair (no drag) | That pair current + smooth to band |
| Drag | Select only |
| Wheel | Spy + persist; first and last reachable by scrolling |
| Hairline | Jump + persist + snap |
| A- / A+ / Exit | Unchanged |
| First / last pair | Reachable via Home / End, click, wheel, hairline — not via Previous / Next |

Restore, dim/current, `n/N`, hairline fill, edge chrome, and `go()` for remaining origins are unchanged.

---

## 7. Evaluation rubric (this change)

Pass threshold: **7.0**. Weighted 1–10, then weighted sum.

| Criterion | Weight | 10 | Fail toward 1 |
| --- | --- | --- | --- |
| Completeness of removal | 0.35 | No Previous/Next in chrome or `SPEC.md`; arrows/j/k/Space do not pair-step; `Movement` has no `'prev'`/`'next'`; no `atFirst`/`atLast`; tests match | Any leftover control, key, spec bullet, or dead pair-step branch |
| Remaining reader | 0.35 | Home/End/click/wheel/hairline/Esc/font/Exit work; chrome still quiet (title left, `n/N` + A- A+ Exit clustered, no hole) | Broken remaining movement, or chrome looking like two buttons were ripped out and not rebalanced (title not flex-1, extra spacer, reordered controls) |
| Spec fidelity | 0.20 | App matches edited `SPEC.md`; no new v1 feature; wrap prose in §6/§7 untouched | Spec still says Previous/Next or “ends do not wrap”; or implementer added a new stepper/TOC/slider |
| Craft | 0.10 | Types/tests tight; no unused vars; autofixer-clean Svelte | `'prev'` still in the type; tests still expect pair-step; unused `shiftKey`/`code` |

**Do not score** the known Home/End highlight flash. Do not score “Space always scrolls.” Do not score A+/A- label order vs DOM.

### Live checks (Evaluator must run)

Import a **4-pair** txt/txt book (four blank-line-separated blocks each side). Open zen. Do **not** leave focus on the hairline range when testing former keys (click a pair first).

| # | Action | Pass | Fail |
| --- | --- | --- | --- |
| 1 | Hover top edge, then bottom edge | Chrome: title, `n/N`, A-, A+, Exit. Hairline stays. Bottom chrome sits above hairline | “Previous” or “Next” visible; missing A-/A+/Exit/`n/N`/title |
| 2 | Chrome layout at rest | Title left; remaining controls a quiet right cluster; no empty button-shaped gap | Controls centered, huge hole, or new icons/capsules |
| 3 | Click pair 2, then `←` `j` `→` `k` | Still pair 2; no `go()` flash-step | Current pair changes |
| 4 | Space, then Shift+Space | Current pair does not step. Page/chapter may scroll natively | Pair steps; or Space is swallowed while a native scroll would have happened on a focused scroller (captured) |
| 5 | Home | Pair 1 on the band; label `1/4` | Stays put / wrong pair / Exit |
| 6 | End | Pair 4 on the band; label `4/4` | Stays put / wrong pair |
| 7 | Click pair 3 (no drag) | Pair 3 lights and scrolls to the band | No move, or drag required |
| 8 | Drag across text on pair 3 | Selection; still pair 3 | Pair changes |
| 9 | Wheel toward pair 1 and pair 4 | Spy updates current pair; both ends reachable | Cannot reach end pairs without the deleted buttons |
| 10 | Hairline hover + jump | Hover shows `n/N`; jump snaps and persists | Broken scrubber |
| 11 | A- then A+ | Passage text only changes size | Chrome type size changes, or buttons gone |
| 12 | Esc, reopen, Exit | Both return to library | Esc or Exit dead |

Reload `/book/:id` still restores the stored pair (pre-existing; fail only if this change broke it).

This is a four-file deletion. If an implementer “fixes” `ignoreSpy`, adds a new pair-step origin, or rewrites wrap for Home/End, that is out of contract.
