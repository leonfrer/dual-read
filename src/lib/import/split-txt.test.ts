import { describe, expect, test } from 'vitest';
import { splitPlainText } from './split-txt';

describe('splitPlainText', () => {
	test('splits on blank lines and keeps a single newline inside a passage', () => {
		expect(
			splitPlainText('First passage.\n\nSecond passage still\non two lines.\n\nThird passage.\n')
		).toEqual(['First passage.', 'Second passage still\non two lines.', 'Third passage.']);
	});

	test('treats extra blank lines as one separator and drops empty blocks', () => {
		expect(splitPlainText('\n\nA.\n\n\n\nB.\n  \n\n')).toEqual(['A.', 'B.']);
	});

	test('returns no passages for an empty or whitespace-only file', () => {
		expect(splitPlainText('')).toEqual([]);
		expect(splitPlainText('  \n\n\t\n')).toEqual([]);
	});
});
