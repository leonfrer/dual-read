import { describe, expect, test } from 'vitest';
import { chromeDock, CHROME_EDGE_PX, movementFromKeyboard } from './movement';

function key(
	partial: Partial<{
		key: string;
		metaKey: boolean;
		ctrlKey: boolean;
		altKey: boolean;
	}>
) {
	return {
		key: '',
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		...partial
	};
}

describe('movementFromKeyboard', () => {
	test('maps the spec keys', () => {
		expect(movementFromKeyboard(key({ key: 'Home' }))).toBe('first');
		expect(movementFromKeyboard(key({ key: 'End' }))).toBe('last');
		expect(movementFromKeyboard(key({ key: 'Escape' }))).toBe('exit');
	});

	test('former pair-step keys do nothing', () => {
		expect(movementFromKeyboard(key({ key: 'ArrowLeft' }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'j' }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'ArrowRight' }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'k' }))).toBeNull();
		expect(movementFromKeyboard(key({ key: ' ' }))).toBeNull();
	});

	test('ignores modified keys and unknown keys', () => {
		expect(movementFromKeyboard(key({ key: 'Home', metaKey: true }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'Home', ctrlKey: true }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'Escape', altKey: true }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'J' }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'e' }))).toBeNull();
	});
});

describe('chromeDock', () => {
	test('reveals at the top and bottom edges only', () => {
		expect(chromeDock(0, 800)).toBe('top');
		expect(chromeDock(CHROME_EDGE_PX, 800)).toBe('top');
		expect(chromeDock(CHROME_EDGE_PX + 1, 800)).toBeNull();
		expect(chromeDock(800 - CHROME_EDGE_PX, 800)).toBe('bottom');
		expect(chromeDock(400, 800)).toBeNull();
	});
});
