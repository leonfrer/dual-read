import { describe, expect, test } from 'vitest';
import { chromeDock, CHROME_EDGE_PX, movementFromKeyboard } from './movement';

function key(
	partial: Partial<{
		key: string;
		code: string;
		shiftKey: boolean;
		metaKey: boolean;
		ctrlKey: boolean;
		altKey: boolean;
	}>
) {
	return {
		key: '',
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		...partial
	};
}

describe('movementFromKeyboard', () => {
	test('maps the spec keys', () => {
		expect(movementFromKeyboard(key({ key: 'ArrowLeft' }))).toBe('prev');
		expect(movementFromKeyboard(key({ key: 'j' }))).toBe('prev');
		expect(movementFromKeyboard(key({ key: 'ArrowRight' }))).toBe('next');
		expect(movementFromKeyboard(key({ key: 'k' }))).toBe('next');
		expect(movementFromKeyboard(key({ key: ' ' }))).toBe('next');
		expect(movementFromKeyboard(key({ key: ' ', shiftKey: true }))).toBe('prev');
		expect(movementFromKeyboard(key({ key: 'Home' }))).toBe('first');
		expect(movementFromKeyboard(key({ key: 'End' }))).toBe('last');
		expect(movementFromKeyboard(key({ key: 'Escape' }))).toBe('exit');
	});

	test('ignores modified keys and unknown keys', () => {
		expect(movementFromKeyboard(key({ key: 'k', metaKey: true }))).toBeNull();
		expect(movementFromKeyboard(key({ key: 'j', ctrlKey: true }))).toBeNull();
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
