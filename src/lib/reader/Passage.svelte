<script lang="ts">
	import type { SourceKind } from '$lib/db';
	import { renderMarkdown } from '$lib/render/markdown';
	import { renderPlainText } from '$lib/render/plain';

	let {
		text,
		kind,
		lang
	}: {
		text: string;
		kind: SourceKind;
		lang: string;
	} = $props();

	let html = $derived(kind === 'markdown' ? renderMarkdown(text) : '');
	let plain = $derived(kind === 'markdown' ? '' : renderPlainText(text));
</script>

<div class="passage min-w-0" {lang}>
	{#if kind === 'markdown'}
		<div class="prose max-w-none prose-neutral dark:prose-invert">
			<!-- HTML is produced by rehype-sanitize. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html}
		</div>
	{:else}
		<p class="whitespace-normal">{plain}</p>
	{/if}
</div>

<style>
	.passage {
		line-height: 1.7;
	}

	.passage[lang='en'] {
		font-family:
			ui-serif, Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', Times,
			serif;
	}

	.passage[lang='zh-Hans'] {
		font-family:
			'Songti SC', STSong, 'Songti TC', PMingLiU, 'PingFang SC', 'Hiragino Sans GB',
			'Noto Serif CJK SC', 'Microsoft YaHei', serif;
	}

	.passage :global(.prose) {
		font-family: inherit;
		line-height: inherit;
		max-width: none;
	}

	.passage :global(.passage-link) {
		text-decoration: underline;
		text-underline-offset: 0.15em;
		cursor: text;
	}

	.passage :global(.table-wrap) {
		max-width: 100%;
		overflow-x: auto;
	}
</style>
