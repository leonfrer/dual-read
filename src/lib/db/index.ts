import { db } from './database';
import type { Book, LibraryItem, NewPair, Pair, Resume, SourceKind } from './types';

export type {
	Book,
	LibraryItem,
	NewPair,
	Pair,
	PrefsRecord,
	Progress,
	Resume,
	SourceKind
} from './types';
export { db, resetDatabase } from './database';

export const FONT_SIZE_MIN = 16;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_DEFAULT = 18;

const PREFS_ID = 'global' as const;

export function clampFontSize(px: number): number {
	if (!Number.isFinite(px)) {
		return FONT_SIZE_DEFAULT;
	}

	return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(px)));
}

function withKinds(book: Book): Book {
	return {
		...book,
		enKind: book.enKind ?? 'txt',
		zhKind: book.zhKind ?? 'txt'
	};
}

export async function createBook(input: {
	title: string;
	pairs: NewPair[];
	enKind?: SourceKind;
	zhKind?: SourceKind;
}): Promise<Book> {
	if (input.pairs.length === 0) {
		throw new Error('Cannot create a book with no pairs.');
	}

	const now = Date.now();
	const book: Book = {
		id: crypto.randomUUID(),
		title: input.title,
		createdAt: now,
		openedAt: now,
		pairCount: input.pairs.length,
		enKind: input.enKind ?? 'txt',
		zhKind: input.zhKind ?? 'txt'
	};

	const pairs: Pair[] = input.pairs.map((pair, index) => ({
		id: crypto.randomUUID(),
		bookId: book.id,
		order: index,
		en: pair.en,
		zh: pair.zh
	}));

	await db.transaction('rw', db.books, db.pairs, db.progress, async () => {
		await db.books.add(book);
		await db.pairs.bulkAdd(pairs);
		await db.progress.add({ bookId: book.id, pairId: pairs[0].id });
	});

	return book;
}

export async function listBooks(): Promise<Book[]> {
	const books = await db.books.orderBy('openedAt').reverse().toArray();
	return books.map(withKinds);
}

export async function listLibrary(): Promise<LibraryItem[]> {
	const books = await listBooks();
	return Promise.all(
		books.map(async (book) => {
			const resume = await getProgress(book.id);
			return { book, position: resume?.position ?? 1 };
		})
	);
}

export async function getBook(id: string): Promise<Book | undefined> {
	const book = await db.books.get(id);
	return book ? withKinds(book) : undefined;
}

export async function markOpened(id: string): Promise<void> {
	const book = await db.books.get(id);
	if (!book) {
		return;
	}

	await db.books.update(id, { openedAt: Date.now() });
}

export async function deleteBook(id: string): Promise<void> {
	await db.transaction('rw', db.books, db.pairs, db.progress, async () => {
		await db.pairs.where('bookId').equals(id).delete();
		await db.progress.delete(id);
		await db.books.delete(id);
	});
}

export async function listPairs(bookId: string): Promise<Pair[]> {
	return db.pairs.where('bookId').equals(bookId).sortBy('order');
}

export async function getPair(id: string): Promise<Pair | undefined> {
	return db.pairs.get(id);
}

export async function getProgress(bookId: string): Promise<Resume | undefined> {
	const pairs = await listPairs(bookId);
	if (pairs.length === 0) {
		return undefined;
	}

	const row = await db.progress.get(bookId);
	let index = pairs.findIndex((pair) => pair.id === row?.pairId);

	if (index === -1) {
		index = 0;
		await db.progress.put({ bookId, pairId: pairs[0].id });
	}

	return { pair: pairs[index], position: index + 1 };
}

export async function setProgress(bookId: string, pairId: string): Promise<void> {
	const book = await db.books.get(bookId);
	if (!book) {
		throw new Error('Book not found.');
	}

	const pair = await db.pairs.get(pairId);
	if (!pair || pair.bookId !== bookId) {
		throw new Error('Pair does not belong to this book.');
	}

	await db.progress.put({ bookId, pairId });
}

export async function getFontSize(): Promise<number> {
	const row = await db.prefs.get(PREFS_ID);
	return row?.fontSize ?? FONT_SIZE_DEFAULT;
}

export async function setFontSize(px: number): Promise<number> {
	const fontSize = clampFontSize(px);
	await db.prefs.put({ id: PREFS_ID, fontSize });
	return fontSize;
}
