import type { Root } from 'hast';
import type { Schema } from 'hast-util-sanitize';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const schema: Schema = {
	...defaultSchema,
	tagNames: [...(defaultSchema.tagNames ?? []), 'span'],
	attributes: {
		...defaultSchema.attributes,
		span: [['className', 'passage-link']],
		div: [...(defaultSchema.attributes?.div ?? []), ['className', 'table-wrap']]
	}
};

function rehypePassage() {
	return (tree: Root) => {
		visit(tree, 'element', (node, index, parent) => {
			if (parent === undefined || index === undefined) {
				return;
			}

			if (node.tagName === 'img') {
				const alt = String(node.properties?.alt ?? '');
				parent.children[index] = { type: 'text', value: alt };
				return;
			}

			if (node.tagName === 'a') {
				node.tagName = 'span';
				node.properties = { className: ['passage-link'] };
				return;
			}

			if (node.tagName === 'table') {
				parent.children[index] = {
					type: 'element',
					tagName: 'div',
					properties: { className: ['table-wrap'] },
					children: [node]
				};
				return 'skip';
			}
		});
	};
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypePassage)
	.use(rehypeSanitize, schema)
	.use(rehypeStringify);

const htmlCache = new Map<string, string>();
const HTML_CACHE_MAX = 800;

export function renderMarkdown(text: string): string {
	const cached = htmlCache.get(text);
	if (cached !== undefined) {
		return cached;
	}

	const html = String(processor.processSync(text));
	htmlCache.set(text, html);
	if (htmlCache.size > HTML_CACHE_MAX) {
		const oldest = htmlCache.keys().next().value;
		if (oldest !== undefined) {
			htmlCache.delete(oldest);
		}
	}

	return html;
}
