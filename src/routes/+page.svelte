<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { markOpened } from '$lib/db';
	import ImportDialog from '$lib/import/ImportDialog.svelte';
	import DeleteBookDialog from '$lib/library/DeleteBookDialog.svelte';
	import { openingBook } from '$lib/opening.svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let pendingDelete = $state<{ id: string; title: string } | null>(null);
	let importing = $state(false);

	let motionMs = $derived(prefersReducedMotion.current ? 0 : 180);

	function fillPercent(position: number, pairCount: number): number {
		if (pairCount <= 0) {
			return 0;
		}

		return (position / pairCount) * 100;
	}

	async function openBook(id: string) {
		if (openingBook.pending) {
			return;
		}

		openingBook.pending = true;

		try {
			await markOpened(id);
			await goto(resolve('/book/[id]', { id }));
		} catch {
			openingBook.pending = false;
		}
	}
</script>

<svelte:head>
	<title>Library — Dual Read</title>
</svelte:head>

<main class="library">
	<header class="header">
		<h1>Library</h1>
		{#if data.items.length > 0}
			<button class="quiet-action text-sm" type="button" onclick={() => (importing = true)}>
				Import book
			</button>
		{/if}
	</header>

	{#if data.items.length === 0}
		<div class="empty">
			<button class="primary-action" type="button" onclick={() => (importing = true)}>
				Import book
			</button>
			<p class="empty-hint">English and Chinese files. Passage counts must match.</p>
		</div>
	{:else}
		<ul class="shelf">
			{#each data.items as item (item.book.id)}
				<li class="book" animate:flip={{ duration: motionMs }} out:fade={{ duration: motionMs }}>
					<button class="open" type="button" onclick={() => openBook(item.book.id)}>
						<span class="title">{item.book.title}</span>
						<span class="count">
							{item.position}/{item.book.pairCount}
						</span>
						<span
							class="bar"
							style:--pct="{fillPercent(item.position, item.book.pairCount)}%"
							aria-hidden="true"
						></span>
					</button>
					<button
						class="quiet-action delete"
						type="button"
						aria-label="Delete {item.book.title}"
						onclick={() => (pendingDelete = { id: item.book.id, title: item.book.title })}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							width="18"
							height="18"
							aria-hidden="true"
						>
							<path
								d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"
								fill="currentColor"
							/>
						</svg>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<ImportDialog bind:open={importing} onimported={() => invalidateAll()} />
<DeleteBookDialog bind:book={pendingDelete} ondeleted={() => invalidateAll()} />

<style>
	.library {
		width: min(42rem, calc(100% - 4rem));
		min-height: 100dvh;
		margin-inline: auto;
		padding-block: 5rem;
	}

	.header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 500;
		letter-spacing: -0.025em;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.empty-hint {
		margin: 0;
		font-size: 0.875rem;
		color: color-mix(in oklab, var(--ink) 55%, transparent);
	}

	.shelf {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.book {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 1.5rem;
		align-items: start;
		padding-block: 1.25rem;
	}

	.open {
		display: grid;
		gap: 0.4rem;
		min-width: 0;
		padding: 0;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
		background: none;
		border: 0;
	}

	.title {
		overflow: hidden;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: color-mix(in oklab, var(--ink) 82%, transparent);
		transition: color 120ms ease;
	}

	.book:hover .title,
	.open:hover .title,
	.open:focus-visible .title {
		color: var(--ink);
	}

	.count {
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		color: color-mix(in oklab, var(--ink) 55%, transparent);
	}

	.bar {
		display: block;
		height: 1px;
		margin-top: 0.35rem;
		background: color-mix(in oklab, var(--ink) 12%, transparent);
	}

	.bar::after {
		display: block;
		width: var(--pct, 0%);
		height: 100%;
		content: '';
		background: color-mix(in oklab, var(--ink) 45%, transparent);
	}

	.delete {
		display: grid;
		place-items: center;
		margin-top: 0.05rem;
		padding: 0.15rem;
		cursor: pointer;
		background: none;
		border: 0;
	}

	@media (hover: none) {
		.title {
			color: var(--ink);
		}
	}

	@media (pointer: coarse) {
		.delete {
			width: 2.75rem;
			height: 2.75rem;
			margin-top: -0.45rem;
			margin-right: -0.55rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.title {
			transition: none;
		}
	}
</style>
