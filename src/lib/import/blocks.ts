export function normalizeSource(text: string): string {
	return text
		.replace(/^\uFEFF/, '')
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n');
}

/** Strip leading and trailing blank lines; keep internal newlines. */
export function trimBlankLines(block: string): string {
	const lines = block.split('\n');
	let start = 0;
	let end = lines.length;

	while (start < end && lines[start].trim() === '') {
		start += 1;
	}

	while (end > start && lines[end - 1].trim() === '') {
		end -= 1;
	}

	return lines.slice(start, end).join('\n');
}

export function keepPassage(block: string): boolean {
	return trimBlankLines(block).trim() !== '';
}
