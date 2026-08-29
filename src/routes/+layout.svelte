<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { openingBook } from '$lib/opening.svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';

	let { children } = $props();

	let motionMs = $derived(prefersReducedMotion.current ? 0 : 180);

	afterNavigate(() => {
		if (page.route.id !== '/book/[id]') {
			openingBook.pending = false;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Dual Read</title>
</svelte:head>

<div aria-busy={openingBook.pending} inert={openingBook.pending}>
	{@render children()}
</div>

{#if openingBook.pending}
	<div class="opening" role="status" aria-label="Opening book" out:fade={{ duration: motionMs }}>
		<span class="opening-mark" aria-hidden="true"></span>
	</div>
{/if}

<style>
	.opening {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		cursor: wait;
		background: Canvas;
	}

	.opening-mark {
		width: 1.35rem;
		height: 1.35rem;
		border: 1.5px solid color-mix(in oklab, CanvasText 18%, transparent);
		border-top-color: color-mix(in oklab, CanvasText 68%, transparent);
		border-radius: 999px;
		animation: opening-spin 0.7s linear infinite;
	}

	@keyframes opening-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.opening-mark {
			animation: none;
			border-color: color-mix(in oklab, CanvasText 45%, transparent);
		}
	}
</style>
