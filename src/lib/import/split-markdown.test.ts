import { describe, expect, test } from 'vitest';
import { fixture } from './fixtures';
import { splitMarkdown } from './split-markdown';

describe('splitMarkdown', () => {
	test('splits by block: heading own page, list one page, yaml and thematic break skipped', () => {
		const passages = splitMarkdown(fixture('en.md'));

		expect(passages).toHaveLength(9);
		expect(passages[0]).toBe('# Chapter one');
		expect(passages[1]).toBe('A short paragraph.');
		expect(passages[2]).toBe('- alpha\n- beta');
		expect(passages[3]).toBe('Wrapping up.');
		expect(passages[4]).toContain('```js');
		expect(passages[4]).toContain('const n = 1');
		expect(passages[5]).toBe('> quoted line');
		expect(passages[6]).toContain('| col | umn |');
		expect(passages[7]).toBe('![a cat](https://example.com/cat.png)');
		expect(passages[8]).toBe('Final paragraph.');

		expect(passages.some((passage) => passage.includes('title: fixture'))).toBe(false);
		expect(passages.some((passage) => passage.trim() === '---')).toBe(false);
	});

	test('treats a setext heading as its own passage', () => {
		expect(splitMarkdown('Title\n=====\n\nBody.\n')).toEqual(['Title\n=====', 'Body.']);
	});

	test('keeps a loose list as one passage', () => {
		const passages = splitMarkdown('- alpha\n\n- beta\n\nAfter.\n');
		expect(passages).toHaveLength(2);
		expect(passages[0]).toContain('- alpha');
		expect(passages[0]).toContain('- beta');
		expect(passages[1]).toBe('After.');
	});

	test('does not throw on an image-only file', () => {
		expect(splitMarkdown('![alt](x.png)\n')).toEqual(['![alt](x.png)']);
	});

	test('returns no passages for yaml-only or break-only files', () => {
		expect(splitMarkdown('---\ntitle: only\n---\n')).toEqual([]);
		expect(splitMarkdown('---\n')).toEqual([]);
	});
});
