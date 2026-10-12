import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { rolldownOptions: { input: { main: 'index.html', demo: 'demo.html' } } },
  test: { include: ['tests/**/*.test.ts'] },
});
