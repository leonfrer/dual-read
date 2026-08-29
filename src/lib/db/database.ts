import Dexie, { type Table } from 'dexie';
import type { Book, Pair, PrefsRecord, Progress } from './types';

export const DB_NAME = 'dual-read';

export class DualReadDB extends Dexie {
	books!: Table<Book, string>;
	pairs!: Table<Pair, string>;
	progress!: Table<Progress, string>;
	prefs!: Table<PrefsRecord, string>;

	constructor(name = DB_NAME) {
		super(name);
		this.version(1).stores({
			books: 'id, openedAt',
			pairs: 'id, bookId',
			progress: 'bookId',
			prefs: 'id'
		});
	}
}

export const db = new DualReadDB();

export async function resetDatabase(): Promise<void> {
	await db.delete();
	await db.open();
}
