import { redirect } from '@sveltejs/kit';
import { getBook, getFontSize, getProgress, listPairs } from '$lib/db';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const book = await getBook(params.id);
	if (!book) {
		redirect(302, '/');
	}

	const pairs = await listPairs(book.id);
	const resume = await getProgress(book.id);
	if (pairs.length === 0 || !resume) {
		redirect(302, '/');
	}

	return {
		book,
		pairs,
		startIndex: resume.position - 1,
		fontSize: await getFontSize()
	};
};
