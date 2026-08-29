import { describe, expect, test } from 'vitest';
import { estimatedPairHeight, overscanRange, sumRange, visibleRange, windowAround } from './window';

describe('sumRange', () => {
	test('sums a slice', () => {
		expect(sumRange([10, 20, 30, 40], 1, 3)).toBe(50);
		expect(sumRange([10, 20, 30], 0, 3)).toBe(60);
		expect(sumRange([10, 20], 2, 2)).toBe(0);
	});
});

describe('visibleRange', () => {
	const heights = [100, 100, 100, 100];

	test('returns empty for no pairs', () => {
		expect(visibleRange([], 0, 100)).toEqual({ start: 0, end: 0 });
	});

	test('covers the overlapping pairs', () => {
		expect(visibleRange(heights, 0, 150)).toEqual({ start: 0, end: 2 });
		expect(visibleRange(heights, 150, 250)).toEqual({ start: 1, end: 3 });
		expect(visibleRange(heights, 350, 400)).toEqual({ start: 3, end: 4 });
	});

	test('clamps past the ends', () => {
		expect(visibleRange(heights, -80, 40)).toEqual({ start: 0, end: 1 });
		expect(visibleRange(heights, 800, 900)).toEqual({ start: 3, end: 4 });
	});
});

describe('overscanRange', () => {
	test('expands by overscan in scroll coordinates', () => {
		const heights = [200, 200, 200, 200, 200];
		expect(overscanRange(heights, 400, 200, 0, 200)).toEqual({ start: 1, end: 4 });
	});
});

describe('windowAround', () => {
	test('keeps the index mounted', () => {
		expect(windowAround(0, 3, 1)).toEqual({ start: 0, end: 2 });
		expect(windowAround(12, 20, 2)).toEqual({ start: 10, end: 15 });
		expect(windowAround(0, 0)).toEqual({ start: 0, end: 0 });
	});
});

describe('estimatedPairHeight', () => {
	test('scales with font size', () => {
		expect(estimatedPairHeight(18)).toBeGreaterThan(100);
		expect(estimatedPairHeight(28)).toBeGreaterThan(estimatedPairHeight(16));
	});

	test('grows with longer passages', () => {
		expect(estimatedPairHeight(18, 'a'.repeat(400), '一'.repeat(80))).toBeGreaterThan(
			estimatedPairHeight(18, 'Hi.', '嗨。')
		);
	});
});
