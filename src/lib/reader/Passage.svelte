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
		line-height: 1.75;
		text-wrap: pretty;
		overflow-wrap: break-word;
		text-rendering: optimizeLegibility;
	}

	.passage[lang='en'] {
		font-family:
			ui-serif, Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', Times,
			serif;
		hanging-punctuation: first allow-end;
	}

	.passage[lang='zh-Hans'] {
		font-family:
			'Songti SC', STSong, 'Songti TC', PMingLiU, 'PingFang SC', 'Hiragino Sans GB',
			'Noto Serif CJK SC', 'Microsoft YaHei', serif;
		line-height: 1.85;
	}

	.passage :global(.prose) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		max-width: none;
		color: inherit;
	}

	.passage :global(.prose > :first-child) {
		margin-top: 0;
	}

	.passage :global(.prose > :last-child) {
		margin-bottom: 0;
	}

	.passage
		:global(.prose :where(p, h1, h2, h3, h4, h5, h6, li, blockquote, strong, em, td, th, a)) {
		color: inherit;
	}

	.passage :global(.prose :where(h1, h2, h3, h4)) {
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.3;
	}

	.passage :global(.prose h1) {
		font-size: 1.42em;
	}

	.passage :global(.prose h2) {
		font-size: 1.22em;
	}

	.passage :global(.prose h3),
	.passage :global(.prose h4) {
		font-size: 1.08em;
	}

	.passage :global(.prose blockquote) {
		margin-inline: 0;
		padding-inline: 0.9em 0;
		border-left: 1px solid color-mix(in oklab, CanvasText 22%, transparent);
		color: color-mix(in oklab, CanvasText 82%, transparent);
	}

	.passage[lang='zh-Hans'] :global(.prose blockquote) {
		font-style: normal;
	}

	.passage :global(.prose :where(code, kbd, pre)) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.86em;
	}

	.passage :global(.prose pre) {
		padding: 0.85em 1em;
		background: color-mix(in oklab, CanvasText 6%, Canvas);
		border-radius: 0.4rem;
		overflow-x: auto;
	}

	.passage :global(.prose :where(code):not(pre code)) {
		padding: 0.12em 0.35em;
		background: color-mix(in oklab, CanvasText 7%, Canvas);
		border-radius: 0.25rem;
	}

	.passage :global(.passage-link) {
		text-decoration: underline;
		text-underline-offset: 0.15em;
		cursor: text;
	}

	.passage :global(.table-wrap) {
		max-width: 100%;
		margin-block: 0.4em;
		overflow-x: auto;
	}

	.passage :global(.prose table) {
		font-size: 0.92em;
	}

	.passage :global(.prose :where(th, td)) {
		padding: 0.35em 0.65em;
	}
</style>
