export type SourceKind = 'txt' | 'markdown';

export type Book = {
	id: string;
	title: string;
	createdAt: number;
	openedAt: number;
	pairCount: number;
	enKind: SourceKind;
	zhKind: SourceKind;
};

export type Pair = {
	id: string;
	bookId: string;
	order: number;
	en: string;
	zh: string;
};

export type Progress = {
	bookId: string;
	pairId: string;
};

export type PrefsRecord = {
	id: 'global';
	fontSize: number;
};

export type Resume = {
	pair: Pair;
	position: number;
};

export type NewPair = {
	en: string;
	zh: string;
};

export type LibraryItem = {
	book: Book;
	position: number;
};
