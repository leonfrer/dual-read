import { keepPassage, trimBlankLines } from './blocks';

/**
 * Split plain text on blank lines (two or more newlines).
 * A single newline stays inside the passage.
 */
export function splitPlainText(text: string): string[] {
	return text
		.split(/\n(?:[ \t]*\n)+/)
		.map(trimBlankLines)
		.filter(keepPassage);
}
