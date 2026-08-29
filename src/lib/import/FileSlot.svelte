<script lang="ts">
	import { IMPORT_ACCEPT, isImportFilename } from './kind';

	let {
		label,
		file,
		onfile
	}: {
		label: string;
		file: File | null;
		onfile: (file: File) => void;
	} = $props();

	let error = $state('');
	let dragging = $state(false);

	function take(next: File | undefined) {
		if (!next) {
			return;
		}

		if (!isImportFilename(next.name)) {
			error = 'Use a .txt, .md, or .markdown file.';
			return;
		}

		error = '';
		onfile(next);
	}

	function ondragenter(event: DragEvent) {
		event.preventDefault();
		dragging = true;
	}

	function ondragover(event: DragEvent) {
		event.preventDefault();
	}

	function ondragleave(event: DragEvent) {
		const next = event.relatedTarget;
		if (
			next instanceof Node &&
			event.currentTarget instanceof Node &&
			event.currentTarget.contains(next)
		) {
			return;
		}

		dragging = false;
	}

	function ondrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		take(event.dataTransfer?.files.item(0) ?? undefined);
	}

	function onchange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		take(input.files?.item(0) ?? undefined);
	}
</script>

<div class="well">
	<label
		class={['slot', dragging && 'dragging', file && 'filled']}
		{ondragenter}
		{ondragover}
		{ondragleave}
		{ondrop}
	>
		<span class="label">{label}</span>
		<span class="file">
			{#if file}
				{file.name}
			{:else}
				Drop a file, or choose one.
			{/if}
		</span>
		<input class="sr-only" type="file" accept={IMPORT_ACCEPT} {onchange} />
	</label>

	{#if error}
		<p class="alert" role="alert">{error}</p>
	{/if}
</div>

<style>
	.well {
		min-width: 0;
	}

	.well :global(.alert) {
		margin-top: 0.75rem;
	}

	.slot {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-height: 9rem;
		cursor: pointer;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		transition: color 120ms ease;
	}

	.file {
		overflow: hidden;
		font-size: 0.875rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: color-mix(in oklab, CanvasText 55%, transparent);
		transition: color 120ms ease;
	}

	.filled .file,
	.dragging .label,
	.dragging .file {
		color: CanvasText;
	}

	@media (prefers-reduced-motion: reduce) {
		.label,
		.file {
			transition: none;
		}
	}
</style>
