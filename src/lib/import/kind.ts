import type { SourceKind } from '$lib/db/types';

export type { SourceKind };

export const IMPORT_ACCEPT = '.txt,.md,.markdown';

function basename(filename: string): string {
	return filename.replace(/^.*[/\\]/, '');
}

export function isImportFilename(filename: string): boolean {
	return /\.(markdown|md|txt)$/i.test(basename(filename));
}

export function titleFromFilename(filename: string): string {
	return basename(filename).replace(/\.(markdown|md|txt)$/i, '');
}

export function sourceKindFromName(filename: string): SourceKind {
	const base = basename(filename).toLowerCase();

	if (base.endsWith('.markdown') || base.endsWith('.md')) {
		return 'markdown';
	}

	if (base.endsWith('.txt')) {
		return 'txt';
	}

	throw new Error(`Unsupported file type: ${filename}`);
}
