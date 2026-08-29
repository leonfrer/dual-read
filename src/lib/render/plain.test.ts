import { expect, test } from 'vitest';
import { renderPlainText } from './plain';

test('collapses internal newlines to spaces and keeps literal asterisks', () => {
	expect(renderPlainText('Second passage still\non two lines.')).toBe(
		'Second passage still on two lines.'
	);
	expect(renderPlainText('*not emphasis*')).toBe('*not emphasis*');
});
