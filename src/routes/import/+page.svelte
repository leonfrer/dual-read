<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { importBook, readUtf8File, titleFromFilename } from '$lib/import';
	import FileSlot from './FileSlot.svelte';

	let title = $state('');
	let autoTitle = $state('');
	let english = $state<File | null>(null);
	let chinese = $state<File | null>(null);
	let error = $state('');
	let busy = $state(false);

	let canSubmit = $derived(english !== null && chinese !== null && !busy);

	function setEnglish(file: File) {
		english = file;
		const next = titleFromFilename(file.name);
		if (title === '' || title === autoTitle) {
			title = next;
		}
		autoTitle = next;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!english || !chinese || busy) {
			return;
		}

		busy = true;
		error = '';

		try {
			const [en, zh] = await Promise.all([readUtf8File(english), readUtf8File(chinese)]);
			const bookTitle = title.trim() || titleFromFilename(english.name);
			await importBook({ title: bookTitle, english: en, chinese: zh });
			await goto(resolve('/'));
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Could not import.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Import book — Dual Read</title>
</svelte:head>

<main class="mx-auto min-h-dvh w-[48rem] max-w-[calc(100%-4rem)] py-16">
	<header class="mb-12 flex items-baseline justify-between gap-8">
		<h1 class="text-2xl font-medium tracking-tight">Import book</h1>
		<a class="quiet-action text-sm" href={resolve('/')}>Cancel</a>
	</header>

	<form class="flex flex-col gap-8" {onsubmit}>
		<label class="block">
			<span class="text-sm font-medium">Title</span>
			<input
				class="mt-2 w-full border-b border-neutral-300 bg-transparent py-1 outline-none dark:border-neutral-700"
				bind:value={title}
				name="title"
			/>
		</label>

		<div class="grid grid-cols-2 gap-6">
			<FileSlot label="English" file={english} onfile={setEnglish} />
			<FileSlot label="Chinese" file={chinese} onfile={(file) => (chinese = file)} />
		</div>

		{#if error}
			<p class="text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>
		{/if}

		<div>
			<button class="quiet-action text-sm" type="submit" disabled={!canSubmit}>
				{busy ? 'Importing…' : 'Import book'}
			</button>
		</div>
	</form>
</main>
