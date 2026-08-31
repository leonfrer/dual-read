<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		FONT_SIZE_MAX,
		FONT_SIZE_MIN,
		setFontSize,
		setProgress,
		type Book,
		type Pair
	} from '$lib/db';
	import { openingBook } from '$lib/opening.svelte';
	import { tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		DIM_OPACITY,
		FOCUS_MS,
		hairlinePercent,
		hasRangeSelection,
		isFinePointer,
		isPointerDrag,
		isTapGesture,
		readingBandOffset
	} from './focus';
	import { chromeDock, movementFromKeyboard } from './movement';
	import Passage from './Passage.svelte';
	import { estimatedPairHeight, overscanRange, sumRange, windowAround } from './window';

	let {
		book,
		pairs,
		startIndex,
		fontSize
	}: {
		book: Book;
		pairs: Pair[];
		startIndex: number;
		fontSize: number;
	} = $props();

	// svelte-ignore state_referenced_locally
	let index = $state(startIndex);
	// svelte-ignore state_referenced_locally
	let size = $state(fontSize);
	let position = $derived(index + 1);
	let fillPercent = $derived(hairlinePercent(position, book.pairCount));

	let hoveringChrome = $state(false);
	let dock = $state<'top' | 'bottom'>('top');
	let chromeVisible = $state(false);
	let touchChrome = $state(false);
	let hairlineActive = $state(false);
	let scroller = $state<HTMLDivElement | null>(null);

	let ignoreSpy = false;
	let selecting = false;
	let goToken = 0;
	let spyFrame = 0;
	let measureFrame = 0;
	let persistTimer = 0;
	const persistMs = 200;

	// svelte-ignore state_referenced_locally
	let heights = pairs.map((pair) => estimatedPairHeight(fontSize, pair.en, pair.zh));
	// svelte-ignore state_referenced_locally
	const initialWindow = windowAround(startIndex, pairs.length);
	let winStart = $state(initialWindow.start);
	let winEnd = $state(initialWindow.end);
	let topSpacer = $state(sumRange(heights, 0, initialWindow.start));
	let bottomSpacer = $state(sumRange(heights, initialWindow.end, heights.length));
	let pointerStart: {
		id: number;
		x: number;
		y: number;
		index: number;
		background: boolean;
		pointerType: string;
		t: number;
	} | null = null;

	function pairRows(): HTMLElement[] {
		if (!scroller) {
			return [];
		}

		return [...scroller.querySelectorAll<HTMLElement>('[data-pair-index]')];
	}

	function rowAt(i: number): HTMLElement | undefined {
		return scroller?.querySelector(`[data-pair-index="${i}"]`) ?? undefined;
	}

	function padTopPx(): number {
		if (!scroller) {
			return 0;
		}

		const pad = scroller.querySelector('.chapter-pad');
		if (!(pad instanceof HTMLElement)) {
			return 0;
		}

		return Number.parseFloat(getComputedStyle(pad).paddingTop) || 0;
	}

	function overscanPx(): number {
		const viewport = scroller?.clientHeight ?? 800;
		return Math.max(1800, viewport * 2);
	}

	function applyWindow(start: number, end: number) {
		const nextStart = Math.max(0, Math.min(start, pairs.length));
		const nextEnd = Math.max(nextStart, Math.min(end, pairs.length));
		winStart = nextStart;
		winEnd = nextEnd;
		topSpacer = sumRange(heights, 0, nextStart);
		bottomSpacer = sumRange(heights, nextEnd, heights.length);
	}

	function syncWindowFromScroll() {
		if (!scroller) {
			return;
		}

		const next = overscanRange(
			heights,
			scroller.scrollTop,
			scroller.clientHeight,
			padTopPx(),
			overscanPx()
		);
		applyWindow(next.start, next.end);
	}

	function measureVisible() {
		if (!scroller) {
			return;
		}

		const rows = pairRows();
		const oldTop = topSpacer;
		let changed = false;

		for (const row of rows) {
			const i = Number(row.dataset.pairIndex);
			const height = row.offsetHeight;
			if (!Number.isInteger(i) || i < 0 || i >= heights.length || height <= 0) {
				continue;
			}

			if (heights[i] !== height) {
				heights[i] = height;
				changed = true;
			}
		}

		if (!changed) {
			return;
		}

		topSpacer = sumRange(heights, 0, winStart);
		bottomSpacer = sumRange(heights, winEnd, heights.length);
		const delta = topSpacer - oldTop;
		if (delta !== 0 && !ignoreSpy) {
			scroller.scrollTop += delta;
		}
	}

	function scheduleMeasure() {
		if (measureFrame) {
			return;
		}

		measureFrame = requestAnimationFrame(() => {
			measureFrame = 0;
			measureVisible();
		});
	}

	function scrollTopForBand(row: HTMLElement): number {
		if (!scroller) {
			return 0;
		}

		const delta =
			row.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top -
			readingBandOffset(scroller.clientHeight);

		return Math.max(0, scroller.scrollTop + delta);
	}

	function persistCurrent(immediate: boolean) {
		const pair = pairs[index];
		if (!pair) {
			return;
		}

		window.clearTimeout(persistTimer);
		persistTimer = 0;

		if (immediate) {
			void setProgress(book.id, pair.id);
			return;
		}

		persistTimer = window.setTimeout(() => {
			persistTimer = 0;
			void setProgress(book.id, pair.id);
		}, persistMs);
	}

	function spy() {
		if (ignoreSpy || selecting || hasRangeSelection(window.getSelection()) || !scroller) {
			return;
		}

		const rows = pairRows();
		if (rows.length === 0) {
			return;
		}

		const band = scroller.getBoundingClientRect().top + readingBandOffset(scroller.clientHeight);
		let next = Number(rows[0]?.dataset.pairIndex ?? index);

		for (const row of rows) {
			if (row.getBoundingClientRect().top <= band) {
				next = Number(row.dataset.pairIndex);
			} else {
				break;
			}
		}

		if (!Number.isInteger(next) || next === index) {
			return;
		}

		index = next;
		persistCurrent(false);
	}

	function dismissTouchChrome() {
		if (!touchChrome) {
			return;
		}

		touchChrome = false;
		if (!hoveringChrome) {
			chromeVisible = false;
		}
	}

	function toggleTouchChrome() {
		touchChrome = !touchChrome;
		if (touchChrome) {
			dock = 'top';
			chromeVisible = true;
			return;
		}

		if (!hoveringChrome) {
			chromeVisible = false;
		}
	}

	function onscroll() {
		if (touchChrome && !ignoreSpy) {
			dismissTouchChrome();
		}

		if (spyFrame) {
			return;
		}

		spyFrame = requestAnimationFrame(() => {
			spyFrame = 0;
			syncWindowFromScroll();
			scheduleMeasure();
			spy();
		});
	}

	function waitForScrollEnd(el: HTMLElement, instant: boolean): Promise<void> {
		return new Promise((resolve) => {
			const timeout = window.setTimeout(finish, instant ? 32 : 500);

			function finish() {
				window.clearTimeout(timeout);
				el.removeEventListener('scrollend', finish);
				resolve();
			}

			el.addEventListener('scrollend', finish);
		});
	}

	async function go(next: number, origin: 'key' | 'click' | 'scrub') {
		if (next < 0 || next >= pairs.length) {
			return;
		}

		const pair = pairs[next];
		if (!pair) {
			return;
		}

		index = next;
		persistCurrent(true);
		if (origin !== 'scrub') {
			dismissTouchChrome();
		}

		if (!scroller) {
			return;
		}

		const around = windowAround(next, pairs.length);
		const scrolled = overscanRange(
			heights,
			sumRange(heights, 0, next),
			scroller.clientHeight,
			0,
			overscanPx()
		);
		applyWindow(Math.min(around.start, scrolled.start), Math.max(around.end, scrolled.end));
		await tick();
		measureVisible();

		const row = rowAt(next);
		if (!row) {
			return;
		}

		const instant = origin === 'scrub' || prefersReducedMotion.current;
		const token = ++goToken;
		ignoreSpy = true;
		scroller.scrollTo({
			top: scrollTopForBand(row),
			behavior: instant ? 'auto' : 'smooth'
		});
		await waitForScrollEnd(scroller, instant);
		syncWindowFromScroll();
		scheduleMeasure();
		if (token === goToken && origin !== 'scrub') {
			ignoreSpy = false;
		}
	}

	function attachScroller(element: HTMLElement) {
		const el = element as HTMLDivElement;
		scroller = el;
		ignoreSpy = true;
		requestAnimationFrame(() => {
			void (async () => {
				el.scrollTop = sumRange(heights, 0, index);
				syncWindowFromScroll();
				await tick();
				measureVisible();
				const row = rowAt(index);
				if (row) {
					el.scrollTop = scrollTopForBand(row);
				}
				openingBook.pending = false;
				window.setTimeout(() => {
					ignoreSpy = false;
				}, 32);
			})();
		});

		return () => {
			if (persistTimer) {
				window.clearTimeout(persistTimer);
				persistTimer = 0;
				const pair = pairs[index];
				if (pair) {
					void setProgress(book.id, pair.id);
				}
			}
			if (scroller === el) {
				scroller = null;
			}
		};
	}

	async function bumpFont(delta: number) {
		const prev = size;
		const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta));
		size = next;
		await setFontSize(next);

		const ratio = next / prev;
		heights = heights.map((height) => Math.max(1, Math.round(height * ratio)));
		applyWindow(winStart, winEnd);
		await tick();
		measureVisible();
		const row = rowAt(index);
		if (row && scroller) {
			scroller.scrollTop = scrollTopForBand(row);
		}
	}

	function onresize() {
		syncWindowFromScroll();
		scheduleMeasure();
	}

	function updateChromeFromMouse(event: PointerEvent) {
		if (hairlineActive) {
			chromeVisible = true;
			return;
		}

		const nextDock = chromeDock(event.clientY, window.innerHeight);
		if (nextDock) {
			dock = nextDock;
			chromeVisible = true;
			return;
		}

		if (!hoveringChrome && !touchChrome) {
			chromeVisible = false;
		}
	}

	function onpointermove(event: PointerEvent) {
		if (event.pointerType === 'mouse') {
			updateChromeFromMouse(event);
		}

		if (
			!pointerStart ||
			event.pointerId !== pointerStart.id ||
			pointerStart.background ||
			pointerStart.pointerType !== 'mouse'
		) {
			return;
		}

		if (isPointerDrag(event.clientX - pointerStart.x, event.clientY - pointerStart.y)) {
			selecting = true;
		}
	}

	function onkeydown(event: KeyboardEvent) {
		const movement = movementFromKeyboard(event);
		if (!movement) {
			return;
		}

		event.preventDefault();

		if (movement === 'exit') {
			void goto(resolve('/'));
			return;
		}

		if (movement === 'first') {
			void go(0, 'key');
			return;
		}

		void go(pairs.length - 1, 'key');
	}

	function onslider(event: Event) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		void go(value - 1, 'scrub');
	}

	function onchapterpointerdown(event: PointerEvent) {
		if (event.button !== 0 || pointerStart) {
			return;
		}

		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		const row = target.closest('[data-pair-index]');
		const raw = row instanceof HTMLElement ? row.dataset.pairIndex : undefined;
		const parsed = raw === undefined ? Number.NaN : Number(raw);
		const next = Number.isInteger(parsed) ? parsed : -1;

		pointerStart = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			index: next,
			background: next < 0,
			pointerType: event.pointerType,
			t: event.timeStamp
		};
	}

	function endHairline() {
		if (!hairlineActive) {
			return;
		}

		hairlineActive = false;
		ignoreSpy = false;
	}

	function onpointerup(event: PointerEvent) {
		endHairline();

		const start = pointerStart;
		if (!start || event.pointerId !== start.id) {
			return;
		}

		pointerStart = null;
		selecting = false;

		if (
			!isTapGesture(
				event.clientX - start.x,
				event.clientY - start.y,
				event.timeStamp - start.t,
				start.pointerType
			)
		) {
			return;
		}

		if (hasRangeSelection(window.getSelection())) {
			return;
		}

		const touchLike = !isFinePointer(start.pointerType);

		if (start.background || start.index === index) {
			if (touchLike) {
				toggleTouchChrome();
			}
			return;
		}

		void go(start.index, 'click');
	}

	function onpointercancel(event: PointerEvent) {
		if (pointerStart && event.pointerId !== pointerStart.id) {
			return;
		}

		pointerStart = null;
		selecting = false;
		endHairline();
	}
</script>

<svelte:window {onpointermove} {onkeydown} {onpointerup} {onpointercancel} {onresize} />

<svelte:head>
	<title>{book.title} — Dual Read</title>
</svelte:head>

<div class="reader">
	<div
		class="chapter-scroll h-full overflow-y-auto"
		{@attach attachScroller}
		role="region"
		aria-label="Chapter"
		data-pair-scroll
		{onscroll}
		onpointerdown={onchapterpointerdown}
	>
		<div class="chapter-pad">
			<div
				class="chapter"
				style:font-size="{size}px"
				style:--dim-opacity={DIM_OPACITY}
				style:--focus-ms="{FOCUS_MS}ms"
			>
				<div class="virt-space" style:height="{topSpacer}px" aria-hidden="true"></div>
				{#each pairs.slice(winStart, winEnd) as pair, offset (pair.id)}
					{@const i = winStart + offset}
					<div
						class={['pair', i === index && 'current']}
						role="group"
						aria-label="Pair {i + 1} of {book.pairCount}"
						data-pair-id={pair.id}
						data-pair-index={i}
						data-current={i === index ? 'true' : 'false'}
						aria-current={i === index ? 'true' : undefined}
					>
						<article class="column" lang="en">
							<Passage text={pair.en} kind={book.enKind} lang="en" lit={i === index} />
						</article>
						<article class="column" lang="zh-Hans">
							<Passage text={pair.zh} kind={book.zhKind} lang="zh-Hans" lit={i === index} />
						</article>
					</div>
				{/each}
				<div class="virt-space" style:height="{bottomSpacer}px" aria-hidden="true"></div>
			</div>
		</div>
	</div>

	<div
		class="chrome"
		role="navigation"
		aria-label="Reader"
		data-chrome
		data-chrome-visible={chromeVisible ? 'true' : 'false'}
		data-chrome-dock={dock}
		inert={!chromeVisible}
		onmouseenter={() => (hoveringChrome = true)}
		onmouseleave={() => {
			hoveringChrome = false;
			if (!touchChrome && !hairlineActive) {
				chromeVisible = false;
			}
		}}
	>
		<div class="chrome-row">
			<p class="chrome-title">{book.title}</p>
			<p class="chrome-progress" data-progress-label>
				{position}/{book.pairCount}
			</p>
			<button
				class="quiet-action"
				type="button"
				disabled={size <= FONT_SIZE_MIN}
				aria-label="Decrease font size"
				onclick={() => bumpFont(-1)}
			>
				A-
			</button>
			<button
				class="quiet-action"
				type="button"
				disabled={size >= FONT_SIZE_MAX}
				aria-label="Increase font size"
				onclick={() => bumpFont(1)}
			>
				A+
			</button>
			<a class="quiet-action" href={resolve('/')}>Exit</a>
		</div>

		<div
			class={['hairline', hairlineActive && 'scrubbing']}
			role="group"
			aria-label="Reading progress"
			data-progress-hairline
			style:--pct={fillPercent}
		>
			<div class="hairline-track"></div>
			<div class="hairline-fill"></div>
			<div class="hairline-thumb"></div>
			<input
				type="range"
				min="1"
				max={book.pairCount}
				value={position}
				aria-label="Progress"
				aria-valuetext="{position} of {book.pairCount}"
				oninput={onslider}
				onpointerdown={() => {
					hairlineActive = true;
					ignoreSpy = true;
				}}
			/>
		</div>
	</div>
</div>

<style>
	.reader {
		--hairline-hit: 12px;
		position: relative;
		height: 100dvh;
		overflow: hidden;
	}

	.chapter-scroll {
		position: relative;
		overscroll-behavior: contain;
		overflow-anchor: none;
		touch-action: pan-y;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in oklab, CanvasText 22%, transparent) transparent;
	}

	.chapter-pad {
		padding-top: 22vh;
		padding-bottom: 78vh;
	}

	.chapter {
		position: relative;
		width: min(100% - 4rem, 67rem);
		margin-inline: auto;
		animation: chapter-in 360ms ease-out;
	}

	.chapter::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1px;
		background: color-mix(in oklab, CanvasText 8%, transparent);
		pointer-events: none;
	}

	.chapter ::selection {
		background: color-mix(in oklab, CanvasText 16%, transparent);
	}

	.virt-space {
		pointer-events: none;
	}

	.pair {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 3rem;
		padding-block: 1.1em;
		contain: layout;
		opacity: var(--dim-opacity, 0.4);
		transition: opacity var(--focus-ms, 180ms) ease;
	}

	.pair::after {
		content: '';
		position: absolute;
		top: 0.55em;
		bottom: 0.55em;
		left: 50%;
		width: 1px;
		background: CanvasText;
		opacity: 0;
		transform: translateX(-50%) scaleY(0.64);
		transform-origin: center;
		transition:
			opacity calc(var(--focus-ms, 180ms) + 40ms) ease,
			transform calc(var(--focus-ms, 180ms) + 40ms) ease;
		pointer-events: none;
	}

	.pair.current {
		opacity: 1;
	}

	.pair.current::after {
		opacity: 0.38;
		transform: translateX(-50%) scaleY(1);
	}

	.column {
		min-width: 0;
		flex: 1 1 0;
		max-width: 32rem;
	}

	.chrome {
		position: absolute;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		inset-inline: 0;
		padding: 1.25rem 2rem 0.45rem;
		font-size: 0.8125rem;
		user-select: none;
		-webkit-user-select: none;
		background: linear-gradient(
			to bottom,
			Canvas 0%,
			Canvas 48%,
			color-mix(in oklab, Canvas 72%, transparent) 76%,
			transparent
		);
		transition:
			opacity 200ms ease,
			transform 200ms ease;
	}

	.chrome[data-chrome-dock='top'] {
		top: 0;
	}

	.chrome[data-chrome-dock='bottom'] {
		bottom: 0;
		flex-direction: column-reverse;
		padding: 0.45rem 2rem 1.25rem;
		background: linear-gradient(
			to top,
			Canvas 0%,
			Canvas 42%,
			color-mix(in oklab, Canvas 72%, transparent) 76%,
			transparent
		);
	}

	.chrome[data-chrome-visible='false'] {
		opacity: 0;
		pointer-events: none;
	}

	.chrome[data-chrome-dock='top'][data-chrome-visible='false'] {
		transform: translateY(-0.35rem);
	}

	.chrome[data-chrome-dock='bottom'][data-chrome-visible='false'] {
		transform: translateY(0.35rem);
	}

	.chrome-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
		width: min(100%, 67rem);
		margin-inline: auto;
	}

	.chrome-title {
		min-width: 0;
		flex: 1 1 auto;
		overflow: hidden;
		font-weight: 500;
		letter-spacing: -0.015em;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chrome-progress {
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
		color: color-mix(in oklab, CanvasText 68%, transparent);
	}

	.hairline {
		--hairline-inset: 8px;
		position: relative;
		flex-shrink: 0;
		width: min(100%, 67rem);
		height: var(--hairline-hit);
		margin-inline: auto;
		touch-action: none;
	}

	.hairline-track,
	.hairline-fill {
		position: absolute;
		top: 50%;
		left: var(--hairline-inset);
		height: 1px;
		transform: translateY(-50%);
	}

	.hairline-track {
		right: var(--hairline-inset);
		background: color-mix(in oklab, CanvasText 16%, transparent);
		transition:
			height 160ms ease,
			background-color 160ms ease;
	}

	.hairline-fill {
		width: calc((100% - 2 * var(--hairline-inset)) * var(--pct, 0) / 100);
		background: color-mix(in oklab, CanvasText 48%, transparent);
		transition:
			width 180ms ease,
			height 160ms ease,
			background-color 160ms ease;
	}

	.hairline-thumb {
		position: absolute;
		top: 50%;
		left: calc(var(--hairline-inset) + (100% - 2 * var(--hairline-inset)) * var(--pct, 0) / 100);
		width: 1.5px;
		height: 8px;
		border-radius: 1px;
		background: CanvasText;
		transform: translate(-50%, -50%);
		transition:
			left 180ms ease,
			height 160ms ease;
	}

	.hairline:focus-within .hairline-track,
	.hairline.scrubbing .hairline-track,
	.hairline:focus-within .hairline-fill,
	.hairline.scrubbing .hairline-fill {
		height: 2px;
	}

	.hairline:focus-within .hairline-thumb,
	.hairline.scrubbing .hairline-thumb {
		height: 12px;
	}

	.hairline.scrubbing .hairline-fill,
	.hairline.scrubbing .hairline-thumb {
		transition: none;
	}

	.hairline input[type='range'] {
		position: absolute;
		inset: 0;
		margin: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
		appearance: none;
		background: transparent;
		touch-action: none;
	}

	.hairline input[type='range']::-webkit-slider-thumb {
		width: var(--hairline-hit);
		height: var(--hairline-hit);
		appearance: none;
		cursor: pointer;
		background: transparent;
	}

	.hairline input[type='range']::-moz-range-thumb {
		width: var(--hairline-hit);
		height: var(--hairline-hit);
		border: 0;
		background: transparent;
	}

	@keyframes chapter-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.hairline:hover .hairline-track,
		.hairline:hover .hairline-fill {
			height: 2px;
		}

		.hairline:hover .hairline-thumb {
			height: 12px;
		}
	}

	@media (pointer: coarse) {
		.reader {
			--hairline-hit: 2.75rem;
		}

		.chrome .quiet-action {
			padding: 0.55rem 0.4rem;
			margin-block: -0.55rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chapter {
			animation: none;
		}

		.pair,
		.pair::after,
		.chrome,
		.hairline-track,
		.hairline-fill,
		.hairline-thumb {
			transition: none;
		}

		.chrome[data-chrome-visible='false'] {
			transform: none;
		}
	}
</style>
