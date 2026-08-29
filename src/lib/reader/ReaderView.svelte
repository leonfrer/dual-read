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
	import Passage from './Passage.svelte';
	import { chromeDock, movementFromKeyboard } from './movement';

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
	let pair = $derived(pairs[index]);
	let position = $derived(index + 1);
	let atFirst = $derived(index <= 0);
	let atLast = $derived(index >= pairs.length - 1);

	let hoveringChrome = $state(false);
	let dock = $state<'top' | 'bottom'>('top');
	let chromeVisible = $state(false);

	async function go(next: number) {
		if (next < 0 || next >= pairs.length) {
			return;
		}

		index = next;
		await setProgress(book.id, pairs[next].id);
	}

	async function bumpFont(delta: number) {
		const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size + delta));
		size = next;
		await setFontSize(next);
	}

	function onmousemove(event: MouseEvent) {
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
			void go(0);
			return;
		}

		if (movement === 'last') {
			void go(pairs.length - 1);
			return;
		}

		void go(index + (movement === 'next' ? 1 : -1));
	}

	function onslider(event: Event) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		void go(value - 1);
	}
</script>

<svelte:window {onmousemove} {onkeydown} />

<svelte:head>
	<title>{book.title} — Dual Read</title>
</svelte:head>

<div class="relative h-dvh">
	<div class="h-full overflow-y-auto" data-pair-scroll>
		{#if pair}
			<div
				class="mx-auto flex w-full max-w-[48rem] gap-10 px-8 py-16"
				style:font-size="{size}px"
				data-pair-id={pair.id}
			>
				<article class="w-1/2 min-w-0" lang="en">
					<Passage text={pair.en} kind={book.enKind} lang="en" />
				</article>
				<article class="w-1/2 min-w-0" lang="zh-Hans">
					<Passage text={pair.zh} kind={book.zhKind} lang="zh-Hans" />
				</article>
			</div>
		{/if}
	</div>

	<div
		class={[
			'absolute inset-x-0 z-10 px-8 py-4 text-sm text-neutral-700 dark:text-neutral-300',
			dock === 'top' ? 'top-0' : 'bottom-0',
			chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
		]}
		style:background="Canvas"
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
		<div class="mx-auto flex max-w-[48rem] flex-wrap items-center gap-x-5 gap-y-2">
			<p class="min-w-0 flex-1 truncate font-medium text-current">{book.title}</p>
			<p class="shrink-0 tabular-nums" data-progress-label>{position}/{book.pairCount}</p>
			<input
				class="min-w-24 flex-1"
				type="range"
				min="1"
				max={book.pairCount}
				value={position}
				aria-label="Progress"
				oninput={onslider}
			/>
			<button
				class="underline-offset-4 hover:underline disabled:opacity-40"
				type="button"
				disabled={atFirst}
				onclick={() => go(index - 1)}
			>
				Previous
			</button>
			<button
				class="underline-offset-4 hover:underline disabled:opacity-40"
				type="button"
				disabled={atLast}
				onclick={() => go(index + 1)}
			>
				Next
			</button>
			<button
				class="underline-offset-4 hover:underline disabled:opacity-40"
				type="button"
				disabled={size <= FONT_SIZE_MIN}
				aria-label="Decrease font size"
				onclick={() => bumpFont(-1)}
			>
				A-
			</button>
			<button
				class="underline-offset-4 hover:underline disabled:opacity-40"
				type="button"
				disabled={size >= FONT_SIZE_MAX}
				aria-label="Increase font size"
				onclick={() => bumpFont(1)}
			>
				A+
			</button>
			<a class="underline-offset-4 hover:underline" href={resolve('/')}>Exit</a>
		</div>
	</div>
</div>
