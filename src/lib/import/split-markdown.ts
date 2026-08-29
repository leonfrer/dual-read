import type { Root, RootContent } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { keepPassage, trimBlankLines } from './blocks';

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']);

const skippedTypes = new Set<RootContent['type']>(['yaml', 'thematicBreak']);

function sliceNode(source: string, node: RootContent): string | undefined {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;

	if (start === undefined || end === undefined) {
		return undefined;
	}

	return source.slice(start, end);
}

/**
 * Split markdown by block. YAML front matter and thematic breaks are not passages.
 * A list is one passage; a heading is its own passage. Images do not fail the split.
 */
export function splitMarkdown(text: string): string[] {
	const tree = parser.parse(text) as Root;
	const passages: string[] = [];

	for (const node of tree.children) {
		if (skippedTypes.has(node.type)) {
			continue;
		}

		const sliced = sliceNode(text, node);
		if (sliced === undefined) {
			continue;
		}

		const passage = trimBlankLines(sliced);
		if (keepPassage(passage)) {
			passages.push(passage);
		}
	}

	return passages;
}
