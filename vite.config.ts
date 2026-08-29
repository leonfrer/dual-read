import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

function kitBase(): string {
	const raw = process.env.BASE_PATH ?? '';
	if (raw === '' || raw === '/') return '';
	return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: 'index.html' }),
			paths: {
				base: kitBase()
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		setupFiles: ['src/test-setup.ts']
	},
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined
});
