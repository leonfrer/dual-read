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

export function renderMarkdown(text: string): string {
	return String(processor.processSync(text));
}
