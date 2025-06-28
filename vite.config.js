import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import glsl from 'vite-plugin-glsl';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	server: {
		fs: {
			allow: ['src', 'png_encode/pkg']
		}
	},
	plugins: [sveltekit(), glsl({ compress: true }), wasm()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		assetsInlineLimit: 0
	}
});
