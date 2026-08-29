<script lang="ts">
	import { importBook, readUtf8File, titleFromFilename } from '$lib/import';
	import FileSlot from './FileSlot.svelte';

	let {
		open = $bindable(false),
		onimported
	}: {
		open: boolean;
		onimported: () => void | Promise<void>;
	} = $props();

	const uid = $props.id();

	let title = $state('');
	let autoTitle = $state('');
	let english = $state<File | null>(null);
	let chinese = $state<File | null>(null);
	let error = $state('');
	let busy = $state(false);

	let canSubmit = $derived(english !== null && chinese !== null && !busy);

	function dismiss() {
		open = false;
		title = '';
		autoTitle = '';
		english = null;
		chinese = null;
		error = '';
		busy = false;
	}

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
			await onimported();
			dismiss();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Could not import.';
		} finally {
			busy = false;
		}
	}

	function attachDialog(element: HTMLDialogElement) {
		function onclose() {
			dismiss();
		}

		element.addEventListener('close', onclose);
		element.showModal();

		return () => {
			element.removeEventListener('close', onclose);
			if (element.open) {
				element.close();
			}
		};
	}

	function ondialogclick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			(event.currentTarget as HTMLDialogElement).close();
		}
	}
</script>

{#if open}
	<dialog
		class="import-dialog"
		aria-labelledby="{uid}-title"
		{@attach attachDialog}
		onclick={ondialogclick}
	>
		<div class="import-panel">
			<header class="mb-10 flex items-baseline justify-between gap-8">
				<h2 class="text-2xl font-medium tracking-tight" id="{uid}-title">Import book</h2>
				<button class="quiet-action text-sm" type="button" onclick={dismiss}> Cancel </button>
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
		</div>
	</dialog>
{/if}

<style>
	.import-dialog {
		width: min(48rem, calc(100% - 4rem));
		max-height: calc(100dvh - 4rem);
		margin: auto;
		padding: 0;
		overflow: auto;
		color: CanvasText;
		background: Canvas;
		border: 1px solid color-mix(in oklab, CanvasText 12%, transparent);
	}

	.import-dialog::backdrop {
		background: color-mix(in oklab, CanvasText 18%, transparent);
	}

	.import-panel {
		padding: 2.5rem 2rem 2rem;
	}
</style>
