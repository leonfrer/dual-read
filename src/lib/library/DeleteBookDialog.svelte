<script lang="ts">
	import { deleteBook } from '$lib/db';
	import { waitForSheetExit } from '$lib/sheet';

	let {
		book = $bindable(null),
		ondeleted
	}: {
		book: { id: string; title: string } | null;
		ondeleted: () => void | Promise<void>;
	} = $props();

	const uid = $props.id();

	let busy = $state(false);
	let error = $state('');
	let removed = false;
	let dialog: HTMLDialogElement | null = null;

	function finishClose() {
		const notify = removed;
		removed = false;
		busy = false;
		error = '';
		book = null;

		if (notify) {
			void ondeleted();
		}
	}

	function dismiss() {
		if (busy || !dialog?.open) {
			return;
		}

		dialog.close();
	}

	async function confirm() {
		if (!book || busy) {
			return;
		}

		busy = true;
		error = '';

		try {
			await deleteBook(book.id);
			removed = true;
			dialog?.close();
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Could not delete.';
			busy = false;
		}
	}

	function attachDialog(element: HTMLDialogElement) {
		dialog = element;

		function onclose() {
			waitForSheetExit(element, finishClose);
		}

		function oncancel(event: Event) {
			if (busy) {
				event.preventDefault();
			}
		}

		element.addEventListener('close', onclose);
		element.addEventListener('cancel', oncancel);
		element.showModal();

		return () => {
			element.removeEventListener('close', onclose);
			element.removeEventListener('cancel', oncancel);
			if (dialog === element) {
				dialog = null;
			}
			if (element.open) {
				element.close();
			}
		};
	}

	function ondialogclick(event: MouseEvent) {
		if (busy || event.target !== event.currentTarget) {
			return;
		}

		(event.currentTarget as HTMLDialogElement).close();
	}
</script>

{#if book}
	<dialog
		class="sheet"
		aria-labelledby="{uid}-title"
		aria-describedby="{uid}-body"
		{@attach attachDialog}
		onclick={ondialogclick}
	>
		<div class="sheet-panel panel">
			<button
				class="quiet-action close"
				type="button"
				disabled={busy}
				aria-label="Close"
				onclick={dismiss}
			>
				<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
					<path
						d="M3.5 3.5l9 9M12.5 3.5l-9 9"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>

			<header class="sheet-header">
				<h2 id="{uid}-title">Delete book</h2>
			</header>

			<div id="{uid}-body">
				<p class="name">{book.title}</p>
				<p class="hint">This removes it from this library.</p>
			</div>

			{#if error}
				<p class="alert" role="alert">{error}</p>
			{/if}

			<button class="danger-action text-sm" type="button" disabled={busy} onclick={confirm}>
				{busy ? 'Deleting…' : 'Delete'}
			</button>
		</div>
	</dialog>
{/if}

<style>
	.panel {
		position: relative;
	}

	.close {
		position: absolute;
		top: 1.1rem;
		right: 1.15rem;
		z-index: 1;
		display: grid;
		place-items: center;
		padding: 0.25rem;
		cursor: pointer;
		background: none;
		border: 0;
	}

	.sheet-header {
		padding-right: 1.75rem;
	}

	.name,
	.hint {
		margin: 0;
	}

	.name {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.hint {
		margin-top: 0.4rem;
		font-size: 0.875rem;
		color: color-mix(in oklab, CanvasText 55%, transparent);
	}
</style>
