import { describe, expect, test } from 'vitest';
import { isImportFilename, sourceKindFromName, titleFromFilename } from './kind';

describe('titleFromFilename', () => {
	test('strips the last allowed extension and any path', () => {
		expect(titleFromFilename('Moby Dick.txt')).toBe('Moby Dick');
		expect(titleFromFilename('notes.md')).toBe('notes');
		expect(titleFromFilename('folder/Book.markdown')).toBe('Book');
		expect(titleFromFilename('My.Book.md')).toBe('My.Book');
	});
});

describe('isImportFilename', () => {
	test('accepts txt, md, and markdown only', () => {
		expect(isImportFilename('a.TXT')).toBe(true);
		expect(isImportFilename('a.md')).toBe(true);
		expect(isImportFilename('a.markdown')).toBe(true);
		expect(isImportFilename('a.epub')).toBe(false);
	});
});

describe('sourceKindFromName', () => {
	test('maps extensions case-insensitively', () => {
		expect(sourceKindFromName('Book.TXT')).toBe('txt');
		expect(sourceKindFromName('Book.md')).toBe('markdown');
		expect(sourceKindFromName('folder/Book.markdown')).toBe('markdown');
	});
});
