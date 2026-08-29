import { afterEach, describe, expect, test, vi } from 'vitest';
import { createId, isUuid } from './id';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('createId', () => {
	test('returns a v4 UUID', () => {
		expect(isUuid(createId())).toBe(true);
	});

	test('does not repeat', () => {
		expect(createId()).not.toBe(createId());
	});

	test('falls back when randomUUID is missing', () => {
		const getRandomValues = crypto.getRandomValues.bind(crypto);
		vi.stubGlobal('crypto', { getRandomValues });

		expect(typeof crypto.randomUUID).toBe('undefined');
		expect(isUuid(createId())).toBe(true);
		expect(createId()).not.toBe(createId());
	});
});
