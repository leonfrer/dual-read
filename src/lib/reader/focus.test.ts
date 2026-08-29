import { describe, expect, test } from 'vitest';
import {
	DRAG_THRESHOLD_PX,
	hairlinePercent,
	indexAtReadingBand,
	isPointerDrag,
	READING_BAND,
	readingBandOffset,
	scrollTopForPair
} from './focus';

describe('indexAtReadingBand', () => {
	test('returns 0 for an empty list', () => {
		expect(indexAtReadingBand([], 100)).toBe(0);
	});

	test('stays on the last pair whose top is at or above the band', () => {
		const tops = [88, 200, 360, 520];
		expect(indexAtReadingBand(tops, 50)).toBe(0);
		expect(indexAtReadingBand(tops, 88)).toBe(0);
		expect(indexAtReadingBand(tops, 199)).toBe(0);
		expect(indexAtReadingBand(tops, 200)).toBe(1);
		expect(indexAtReadingBand(tops, 400)).toBe(2);
		expect(indexAtReadingBand(tops, 800)).toBe(3);
	});
});

describe('scrollTopForPair', () => {
	test('aligns the pair top to the reading band', () => {
		expect(scrollTopForPair(220, 1000)).toBe(0);
		expect(scrollTopForPair(400, 1000)).toBe(400 - 1000 * READING_BAND);
	});

	test('does not scroll above 0', () => {
		expect(scrollTopForPair(0, 1000)).toBe(0);
	});
});

describe('readingBandOffset', () => {
	test('is a fraction of the viewport', () => {
		expect(readingBandOffset(1000)).toBe(220);
	});
});

describe('isPointerDrag', () => {
	test('treats tiny movement as a click', () => {
		expect(isPointerDrag(0, 0)).toBe(false);
		expect(isPointerDrag(DRAG_THRESHOLD_PX, 0)).toBe(false);
	});

	test('treats movement past the threshold as a drag', () => {
		expect(isPointerDrag(DRAG_THRESHOLD_PX + 1, 0)).toBe(true);
		expect(isPointerDrag(3, 5)).toBe(true);
	});
});

describe('hairlinePercent', () => {
	test('pins a single pair to the start', () => {
		expect(hairlinePercent(1, 1)).toBe(0);
	});

	test('puts first and last pairs at the ends', () => {
		expect(hairlinePercent(1, 5)).toBe(0);
		expect(hairlinePercent(5, 5)).toBe(100);
		expect(hairlinePercent(3, 5)).toBe(50);
	});
});
