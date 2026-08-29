<script lang="ts">
	import { IMPORT_ACCEPT, isImportFilename } from '$lib/import';

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

	function ondragover(event: DragEvent) {
		event.preventDefault();
		dragging = true;
	}

	function ondragleave() {
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

<label
	class={[
		'block cursor-pointer rounded-sm border border-neutral-300 px-4 py-8 dark:border-neutral-700',
		dragging && 'border-current'
	]}
	{ondragover}
	{ondragleave}
	{ondrop}
>
	<span class="block text-sm font-medium">{label}</span>
	<span class="mt-2 block text-sm text-neutral-600 dark:text-neutral-400">
		{#if file}
			{file.name}
		{:else}
			Drop a file, or choose one.
		{/if}
	</span>
	<input class="sr-only" type="file" accept={IMPORT_ACCEPT} {onchange} />
</label>

{#if error}
	<p class="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>
{/if}
