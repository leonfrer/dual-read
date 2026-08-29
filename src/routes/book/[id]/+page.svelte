<script lang="ts">
	import ReaderView from '$lib/reader/ReaderView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#key data.book.id}
	<ReaderView
		book={data.book}
		pairs={data.pairs}
		startIndex={data.startIndex}
		fontSize={data.fontSize}
	/>
{/key}
