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
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import {
		DIM_OPACITY,
		FOCUS_MS,
		hairlinePercent,
		indexAtReadingBand,
		isPointerDrag,
		readingBandOffset,
		scrollTopForPair
	} from './focus';
	import { chromeDock, movementFromKeyboard } from './movement';
	import Passage from './Passage.svelte';

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
	let hairlineHover = $state(false);
	let hairlineActive = $state(false);
	let scroller = $state<HTMLDivElement | null>(null);
	let motionMs = $derived(prefersReducedMotion.current ? 0 : 180);

	let ignoreSpy = false;
	let selecting = false;
	let goToken = 0;
	let spyFrame = 0;
	let pointerStart = { x: 0, y: 0, index: -1 };

	function pairRows(): HTMLElement[] {
		if (!scroller) {
			return [];
		}

		return [...scroller.querySelectorAll<HTMLElement>('[data-pair-id]')];
	}

	function spy() {
		if (ignoreSpy || selecting || !scroller) {
			return;
		}

		const rows = pairRows();
		const tops = rows.map((row) => row.offsetTop);
		const bandY = scroller.scrollTop + readingBandOffset(scroller.clientHeight);
		const next = indexAtReadingBand(tops, bandY);
		if (next === index) {
			return;
		}

		index = next;
		const pair = pairs[next];
		if (pair) {
			void setProgress(book.id, pair.id);
		}
	}

	function onscroll() {
		if (spyFrame) {
			return;
		}

		spyFrame = requestAnimationFrame(() => {
			spyFrame = 0;
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
		void setProgress(book.id, pair.id);

		if (!scroller) {
			return;
		}

		const row = pairRows()[next];
		if (!row) {
			return;
		}

		const instant = origin === 'scrub' || prefersReducedMotion.current;
		const token = ++goToken;
		ignoreSpy = true;
		scroller.scrollTo({
			top: scrollTopForPair(row.offsetTop, scroller.clientHeight),
			behavior: instant ? 'auto' : 'smooth'
		});
		await waitForScrollEnd(scroller, instant);
		if (token === goToken && origin !== 'scrub') {
			ignoreSpy = false;
		}
	}

	function attachScroller(element: HTMLElement) {
		const el = element as HTMLDivElement;
		scroller = el;
		ignoreSpy = true;
		requestAnimationFrame(() => {
			const row = pairRows()[index];
			if (row) {
				el.scrollTop = scrollTopForPair(row.offsetTop, el.clientHeight);
			}
			window.setTimeout(() => {
				ignoreSpy = false;
			}, 32);
			openingBook.pending = false;
		});

		return () => {
			if (scroller === el) {
				scroller = null;
			}
		};
	}

	async function bumpFont(delta: number) {
		const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size + delta));
		size = next;
		await setFontSize(next);
	}

	function onmousemove(event: MouseEvent) {
		if (
			event.target instanceof Element &&
			event.target.closest('[data-progress-hairline]') &&
			!hoveringChrome
		) {
			chromeVisible = false;
			return;
		}

		const nextDock = chromeDock(event.clientY, window.innerHeight);
		if (nextDock) {
			dock = nextDock;
			chromeVisible = true;
			return;
		}

		if (!hoveringChrome) {
			chromeVisible = false;
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

	function onpairpointerdown(event: PointerEvent, next: number) {
		if (event.button !== 0) {
			return;
		}

		selecting = true;
		pointerStart = { x: event.clientX, y: event.clientY, index: next };
	}

	function onpointerup(event: PointerEvent) {
		const start = pointerStart;
		selecting = false;
		pointerStart = { x: 0, y: 0, index: -1 };

		if (hairlineActive) {
			hairlineActive = false;
			ignoreSpy = false;
		}

		if (start.index < 0) {
			return;
		}

		if (isPointerDrag(event.clientX - start.x, event.clientY - start.y)) {
			return;
		}

		if (start.index === index) {
			return;
		}

		void go(start.index, 'click');
	}

	function onpointercancel() {
		selecting = false;
		pointerStart = { x: 0, y: 0, index: -1 };
		if (hairlineActive) {
			hairlineActive = false;
			ignoreSpy = false;
		}
	}
</script>

<svelte:window {onmousemove} {onkeydown} {onpointerup} {onpointercancel} />

<svelte:head>
	<title>{book.title} — Dual Read</title>
</svelte:head>

<div class="relative h-dvh">
	<div
		class="chapter-scroll h-full overflow-y-auto"
		{@attach attachScroller}
		data-pair-scroll
		{onscroll}
	>
		<div class="chapter-pad">
			<div
				class="chapter"
				style:font-size="{size}px"
				style:--dim-opacity={DIM_OPACITY}
				style:--focus-ms="{FOCUS_MS}ms"
			>
				{#each pairs as pair, i (pair.id)}
					<div
						class={['pair', i === index && 'current']}
						role="group"
						aria-label="Pair {i + 1} of {book.pairCount}"
						data-pair-id={pair.id}
						data-current={i === index ? 'true' : 'false'}
						aria-current={i === index ? 'true' : undefined}
						onpointerdown={(event) => onpairpointerdown(event, i)}
					>
						<article class="column" lang="en">
							<Passage text={pair.en} kind={book.enKind} lang="en" />
						</article>
						<article class="column" lang="zh-Hans">
							<Passage text={pair.zh} kind={book.zhKind} lang="zh-Hans" />
						</article>
					</div>
				{/each}
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
			chromeVisible = false;
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
	</div>

	<div
		class={['hairline', hairlineActive && 'scrubbing']}
		role="group"
		aria-label="Reading progress"
		data-progress-hairline
		style:--pct={fillPercent}
		onpointerenter={() => (hairlineHover = true)}
		onpointerleave={() => {
			if (!hairlineActive) {
				hairlineHover = false;
			}
		}}
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
				hairlineHover = true;
				ignoreSpy = true;
			}}
		/>
		{#if hairlineHover || hairlineActive}
			<p class="hairline-label" data-hairline-label transition:fade={{ duration: motionMs }}>
				{position}/{book.pairCount}
			</p>
		{/if}
	</div>
</div>

<style>
	.chapter-scroll {
		position: relative;
		overscroll-behavior: contain;
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

	.pair {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 3rem;
		padding-block: 1.1em;
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
		inset-inline: 0;
		padding: 1.35rem 2rem 1.85rem;
		font-size: 0.8125rem;
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
		bottom: 0.75rem;
		padding: 1.85rem 2rem 1.15rem;
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
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 30;
		height: 12px;
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

	.hairline:hover .hairline-track,
	.hairline:focus-within .hairline-track,
	.hairline.scrubbing .hairline-track,
	.hairline:hover .hairline-fill,
	.hairline:focus-within .hairline-fill,
	.hairline.scrubbing .hairline-fill {
		height: 2px;
	}

	.hairline:hover .hairline-thumb,
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
		height: 12px;
		cursor: pointer;
		appearance: none;
		background: transparent;
	}

	.hairline input[type='range']::-webkit-slider-thumb {
		width: 12px;
		height: 12px;
		appearance: none;
		cursor: pointer;
		background: transparent;
	}

	.hairline input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border: 0;
		background: transparent;
	}

	.hairline-label {
		position: absolute;
		bottom: 16px;
		left: clamp(
			2.25rem,
			calc(var(--hairline-inset) + (100% - 2 * var(--hairline-inset)) * var(--pct, 0) / 100),
			calc(100% - 2.25rem)
		);
		padding: 0.12em 0.45em;
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
		color: color-mix(in oklab, CanvasText 82%, transparent);
		background: Canvas;
		transform: translateX(-50%);
		pointer-events: none;
	}

	@keyframes chapter-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
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
