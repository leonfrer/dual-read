import { listLibrary } from '$lib/db';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return { items: await listLibrary() };
};
