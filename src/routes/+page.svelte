<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { deleteBook, markOpened } from '$lib/db';
	import ImportDialog from '$lib/import/ImportDialog.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let pendingDeleteId = $state<string | null>(null);
	let importing = $state(false);

	async function openBook(id: string) {
		await markOpened(id);
		await goto(resolve('/book/[id]', { id }));
	}

	async function confirmDelete(id: string) {
		await deleteBook(id);
		pendingDeleteId = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Library — Dual Read</title>
</svelte:head>

<main class="mx-auto min-h-dvh w-[42rem] max-w-[calc(100%-4rem)] py-16">
	<header class="mb-12 flex items-baseline justify-between gap-8">
		<h1 class="text-2xl font-medium tracking-tight">Library</h1>
		{#if data.items.length > 0}
			<button class="quiet-action text-sm" type="button" onclick={() => (importing = true)}>
				Import book
			</button>
		{/if}
	</header>

	{#if data.items.length === 0}
		<p>
			<button class="quiet-action" type="button" onclick={() => (importing = true)}>
				Import book
			</button>
		</p>
	{:else}
		<ul class="divide-y divide-neutral-200 dark:divide-neutral-800">
			{#each data.items as item (item.book.id)}
				<li class="flex items-baseline justify-between gap-6 py-4">
					<button class="min-w-0 text-left" type="button" onclick={() => openBook(item.book.id)}>
						<span class="block truncate font-medium">{item.book.title}</span>
						<span class="text-sm text-neutral-600 dark:text-neutral-400">
							{item.position}/{item.book.pairCount}
						</span>
					</button>

					{#if pendingDeleteId === item.book.id}
						<span class="flex shrink-0 items-baseline gap-3 text-sm">
							<button
								class="quiet-action"
								type="button"
								onclick={() => confirmDelete(item.book.id)}
							>
								Delete
							</button>
							<button class="quiet-action" type="button" onclick={() => (pendingDeleteId = null)}>
								Cancel
							</button>
						</span>
					{:else}
						<button
							class="quiet-action shrink-0 text-sm"
							type="button"
							onclick={() => (pendingDeleteId = item.book.id)}
						>
							Delete
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>

<ImportDialog bind:open={importing} onimported={() => invalidateAll()} />
