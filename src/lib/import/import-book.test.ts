import { getProgress, listBooks, listPairs, resetDatabase } from '$lib/db';
import { beforeEach, describe, expect, test } from 'vitest';
import { fixture } from './fixtures';
import { importBook, ImportCountError, readUtf8File, splitSource } from './import-book';

beforeEach(async () => {
	await resetDatabase();
});

describe('importBook', () => {
	test('imports matching txt + txt and persists progress at the first pair', async () => {
		const book = await importBook({
			title: 'Plain pair',
			english: { name: 'en.txt', text: fixture('en.txt') },
			chinese: { name: 'zh.txt', text: fixture('zh.txt') }
		});

		expect(book.title).toBe('Plain pair');
		expect(book.pairCount).toBe(3);

		const pairs = await listPairs(book.id);
		expect(pairs.map((pair) => pair.order)).toEqual([0, 1, 2]);
		expect(pairs[0]?.en).toBe('First passage.');
		expect(pairs[1]?.en).toContain('\n');
		expect(pairs[0]?.zh).toBe('第一段。');

		const resume = await getProgress(book.id);
		expect(resume?.position).toBe(1);
		expect(resume?.pair.id).toBe(pairs[0]?.id);
	});

	test('imports matching txt + markdown when counts match', async () => {
		const book = await importBook({
			title: 'Mixed',
			english: { name: 'en.md', text: fixture('en.md') },
			chinese: { name: 'zh.txt', text: fixture('zh-from-md.txt') }
		});

		expect(book.pairCount).toBe(9);
		const pairs = await listPairs(book.id);
		expect(pairs[0]?.en).toBe('# Chapter one');
		expect(pairs[2]?.en).toBe('- alpha\n- beta');
		expect(pairs[7]?.en).toContain('![a cat]');
	});

	test('imports .markdown the same as .md', async () => {
		const book = await importBook({
			title: 'Markdown ext',
			english: { name: 'en.markdown', text: fixture('en.md') },
			chinese: { name: 'zh.txt', text: fixture('zh-from-md.txt') }
		});

		expect(book.pairCount).toBe(9);
	});

	test('does not create a book when counts differ; error includes both counts', async () => {
		const existing = await importBook({
			title: 'Keep',
			english: { name: 'en.txt', text: fixture('en.txt') },
			chinese: { name: 'zh.txt', text: fixture('zh.txt') }
		});

		await expect(
			importBook({
				title: 'Bad',
				english: { name: 'en.txt', text: fixture('mismatch-en.txt') },
				chinese: { name: 'zh.txt', text: fixture('mismatch-zh.txt') }
			})
		).rejects.toMatchObject({
			name: 'ImportCountError',
			enCount: 3,
			zhCount: 2,
			message: 'Cannot import: English has 3 passages, Chinese has 2. Counts must match.'
		});

		const books = await listBooks();
		expect(books).toHaveLength(1);
		expect(books[0]?.id).toBe(existing.id);
	});

	test('does not create a book when a side has 0 blocks', async () => {
		await expect(
			importBook({
				title: 'Empty',
				english: { name: 'en.txt', text: '   \n\n' },
				chinese: { name: 'zh.txt', text: fixture('zh.txt') }
			})
		).rejects.toThrow(ImportCountError);

		try {
			await importBook({
				title: 'Empty',
				english: { name: 'en.txt', text: '   \n\n' },
				chinese: { name: 'zh.txt', text: fixture('zh.txt') }
			});
		} catch (error) {
			expect(error).toBeInstanceOf(ImportCountError);
			expect((error as ImportCountError).message).toBe(
				'Cannot import: English has 0 passages, Chinese has 3. Counts must match.'
			);
		}

		expect(await listBooks()).toEqual([]);
	});
});

describe('readUtf8File', () => {
	test('reads a File as UTF-8 including CJK', async () => {
		const file = new File(['你好'], 'zh.txt', { type: 'text/plain' });
		await expect(readUtf8File(file)).resolves.toEqual({ name: 'zh.txt', text: '你好' });
	});
});

describe('splitSource', () => {
	test('does not throw when markdown contains an image', () => {
		expect(() => splitSource({ name: 'en.md', text: '![alt](x.png)\n\nOk.\n' })).not.toThrow();
	});
});
