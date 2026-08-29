import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	createBook,
	db,
	deleteBook,
	FONT_SIZE_DEFAULT,
	FONT_SIZE_MAX,
	FONT_SIZE_MIN,
	getBook,
	getFontSize,
	getProgress,
	listBooks,
	listPairs,
	markOpened,
	resetDatabase,
	setFontSize,
	setProgress
} from './index';

const samplePairs = [
	{ en: 'One.', zh: '一。' },
	{ en: 'Two.', zh: '二。' },
	{ en: 'Three.', zh: '三。' }
];

beforeEach(async () => {
	vi.restoreAllMocks();
	await resetDatabase();
});

describe('createBook', () => {
	test('writes a new book, pairs with order 0..n-1, and progress at the first pair', async () => {
		const book = await createBook({ title: 'Demo', pairs: samplePairs });

		expect(book.title).toBe('Demo');
		expect(book.pairCount).toBe(3);
		expect(book.createdAt).toBe(book.openedAt);
		expect(book.enKind).toBe('txt');
		expect(book.zhKind).toBe('txt');
		expect(Object.keys(book).sort()).toEqual([
			'createdAt',
			'enKind',
			'id',
			'openedAt',
			'pairCount',
			'title',
			'zhKind'
		]);

		const pairs = await listPairs(book.id);
		expect(pairs.map((pair) => pair.order)).toEqual([0, 1, 2]);
		expect(pairs.map((pair) => pair.en)).toEqual(['One.', 'Two.', 'Three.']);
		expect(new Set(pairs.map((pair) => pair.id)).size).toBe(3);

		const resume = await getProgress(book.id);
		expect(resume?.position).toBe(1);
		expect(resume?.pair.id).toBe(pairs[0].id);
		expect(resume?.pair.order).toBe(0);
	});

	test('creates two books when the same title and pairs are imported twice', async () => {
		const first = await createBook({ title: 'Demo', pairs: samplePairs });
		const second = await createBook({ title: 'Demo', pairs: samplePairs });

		expect(first.id).not.toBe(second.id);

		const books = await listBooks();
		expect(books).toHaveLength(2);
		expect(books.map((book) => book.id).sort()).toEqual([first.id, second.id].sort());
	});

	test('allows an empty side on a pair', async () => {
		const book = await createBook({
			title: 'Later edit',
			pairs: [{ en: 'Hello.', zh: '' }]
		});

		const pairs = await listPairs(book.id);
		expect(pairs[0]?.zh).toBe('');
	});

	test('rejects a book with no pairs', async () => {
		await expect(createBook({ title: 'Empty', pairs: [] })).rejects.toThrow(
			'Cannot create a book with no pairs.'
		);
		expect(await listBooks()).toEqual([]);
	});
});

describe('listBooks', () => {
	test('sorts most recently opened first', async () => {
		let now = 1_000_000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);

		const older = await createBook({ title: 'Older', pairs: samplePairs });
		now += 10;
		const newer = await createBook({ title: 'Newer', pairs: samplePairs });

		expect((await listBooks()).map((book) => book.id)).toEqual([newer.id, older.id]);

		now += 10;
		await markOpened(older.id);

		expect((await listBooks()).map((book) => book.id)).toEqual([older.id, newer.id]);
	});
});

describe('progress', () => {
	test('setProgress persists and getProgress restores that pairId', async () => {
		const book = await createBook({ title: 'Demo', pairs: samplePairs });
		const pairs = await listPairs(book.id);

		await setProgress(book.id, pairs[2].id);

		const resume = await getProgress(book.id);
		expect(resume?.pair.id).toBe(pairs[2].id);
		expect(resume?.position).toBe(3);
	});

	test('snaps to the first pair by order when pairId is missing and persists the snap', async () => {
		const book = await createBook({ title: 'Demo', pairs: samplePairs });
		const pairs = await listPairs(book.id);

		await db.progress.put({ bookId: book.id, pairId: 'missing-pair' });

		const resume = await getProgress(book.id);
		expect(resume?.pair.id).toBe(pairs[0].id);
		expect(resume?.position).toBe(1);

		const stored = await db.progress.get(book.id);
		expect(stored?.pairId).toBe(pairs[0].id);
	});
});

describe('deleteBook', () => {
	test('removes the book, its pairs, and its progress row', async () => {
		const keep = await createBook({ title: 'Keep', pairs: samplePairs });
		const drop = await createBook({ title: 'Drop', pairs: samplePairs });

		await deleteBook(drop.id);

		expect(await getBook(drop.id)).toBeUndefined();
		expect(await listPairs(drop.id)).toEqual([]);
		expect(await db.progress.get(drop.id)).toBeUndefined();

		expect(await getBook(keep.id)).toEqual(keep);
		expect(await listPairs(keep.id)).toHaveLength(3);
		expect(await db.progress.get(keep.id)).toBeDefined();
	});
});

describe('prefs', () => {
	test('defaults font size and persists a clamped global value', async () => {
		expect(await getFontSize()).toBe(FONT_SIZE_DEFAULT);

		expect(await setFontSize(20)).toBe(20);
		expect(await getFontSize()).toBe(20);

		expect(await setFontSize(8)).toBe(FONT_SIZE_MIN);
		expect(await setFontSize(48)).toBe(FONT_SIZE_MAX);
		expect(await getFontSize()).toBe(FONT_SIZE_MAX);
	});
});
