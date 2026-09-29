import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
// VITE_PREVIEW=1 builds a single self-contained HTML demo with canned sample data.
export default defineConfig({ appType: 'spa', plugins: process.env.VITE_PREVIEW === '1' ? [viteSingleFile()] : [], build: { target: 'es2022' } });
