import { describe, expect, test } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	test('renders a heading as a heading', () => {
		expect(renderMarkdown('# Chapter one')).toContain('<h1>Chapter one</h1>');
	});

	test('renders a whole list as one list', () => {
		const html = renderMarkdown('- alpha\n- beta');
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>alpha</li>');
		expect(html).toContain('<li>beta</li>');
		expect(html.match(/<ul>/g)).toHaveLength(1);
	});

	test('renders a table', () => {
		const html = renderMarkdown('| col | umn |\n| --- | --- |\n| a | b |');
		expect(html).toContain('<table>');
		expect(html).toContain('table-wrap');
		expect(html).toContain('<th>col</th>');
	});

	test('replaces images with alt text and does not emit img', () => {
		const html = renderMarkdown('![a cat](https://example.com/cat.png)');
		expect(html).toContain('a cat');
		expect(html).not.toContain('<img');
	});

	test('styles links as non-clickable spans', () => {
		const html = renderMarkdown('See [docs](https://example.com).');
		expect(html).toContain('passage-link');
		expect(html).toContain('docs');
		expect(html).not.toContain('<a ');
		expect(html).not.toContain('href');
	});
});
