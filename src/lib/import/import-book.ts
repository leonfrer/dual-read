import { createBook, type Book } from '$lib/db';
import { normalizeSource } from './blocks';
import { sourceKindFromName } from './kind';
import { splitMarkdown } from './split-markdown';
import { splitPlainText } from './split-txt';

export type SourceFile = {
	name: string;
	text: string;
};

export class ImportCountError extends Error {
	readonly enCount: number;
	readonly zhCount: number;

	constructor(enCount: number, zhCount: number) {
		super(
			`Cannot import: English has ${enCount} passages, Chinese has ${zhCount}. Counts must match.`
		);
		this.name = 'ImportCountError';
		this.enCount = enCount;
		this.zhCount = zhCount;
	}
}

export function splitSource(file: SourceFile): string[] {
	const kind = sourceKindFromName(file.name);
	const text = normalizeSource(file.text);
	return kind === 'markdown' ? splitMarkdown(text) : splitPlainText(text);
}

export async function readUtf8File(file: File): Promise<SourceFile> {
	return { name: file.name, text: await file.text() };
}

export async function importBook(input: {
	title: string;
	english: SourceFile;
	chinese: SourceFile;
}): Promise<Book> {
	const enBlocks = splitSource(input.english);
	const zhBlocks = splitSource(input.chinese);

	if (enBlocks.length === 0 || zhBlocks.length === 0 || enBlocks.length !== zhBlocks.length) {
		throw new ImportCountError(enBlocks.length, zhBlocks.length);
	}

	return createBook({
		title: input.title,
		pairs: enBlocks.map((en, index) => ({ en, zh: zhBlocks[index] })),
		enKind: sourceKindFromName(input.english.name),
		zhKind: sourceKindFromName(input.chinese.name)
	});
}
