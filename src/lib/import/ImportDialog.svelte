<script lang="ts">
	import { importBook, readUtf8File, titleFromFilename } from '$lib/import';
	import { waitForSheetExit } from '$lib/sheet';
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
	let dialog: HTMLDialogElement | null = null;

	function reset() {
		open = false;
		title = '';
		autoTitle = '';
		english = null;
		chinese = null;
		error = '';
		busy = false;
	}

	function dismiss() {
		dialog?.close();
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
			dialog?.close();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Could not import.';
		} finally {
			busy = false;
		}
	}

	function attachDialog(element: HTMLDialogElement) {
		dialog = element;

		function onclose() {
			waitForSheetExit(element, reset);
		}

		element.addEventListener('close', onclose);
		element.showModal();

		return () => {
			element.removeEventListener('close', onclose);
			if (dialog === element) {
				dialog = null;
			}
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
		class="sheet import-sheet"
		aria-labelledby="{uid}-title"
		{@attach attachDialog}
		onclick={ondialogclick}
	>
		<div class="sheet-panel">
			<header class="sheet-header">
				<h2 id="{uid}-title">Import book</h2>
				<button class="quiet-action text-sm" type="button" onclick={dismiss}>Cancel</button>
			</header>

			<form class="form" {onsubmit}>
				<label class="field">
					<span>Title</span>
					<input bind:value={title} name="title" />
				</label>

				<div class="wells">
					<FileSlot label="English" file={english} onfile={setEnglish} />
					<FileSlot label="Chinese" file={chinese} onfile={(file) => (chinese = file)} />
				</div>

				{#if error}
					<p class="alert" role="alert">{error}</p>
				{/if}

				<button class="primary-action" type="submit" disabled={!canSubmit}>
					{busy ? 'Importing…' : 'Import book'}
				</button>
			</form>
		</div>
	</dialog>
{/if}

<style>
	.import-sheet {
		width: min(42rem, calc(100% - 4rem));
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 2.25rem;
	}

	.field {
		display: grid;
		gap: 0.5rem;
	}

	.field span {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.field input {
		width: 100%;
		padding: 0.35rem 0 0.6rem;
		font: inherit;
		color: inherit;
		background: transparent;
		border: 0;
		border-bottom: 1px solid color-mix(in oklab, var(--ink) 12%, transparent);
		border-radius: 0;
		transition: border-color 120ms ease;
	}

	.field input:hover,
	.field input:focus-visible {
		outline: none;
		border-bottom-color: var(--ink);
	}

	.wells {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 3rem;
	}

	.wells::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1px;
		background: color-mix(in oklab, var(--ink) 12%, transparent);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.field input {
			transition: none;
		}
	}
</style>
