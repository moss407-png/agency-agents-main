import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> normal installable web app in dist/
// `npm run build:preview` -> one self-contained HTML file in dist-preview/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'preview' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'preview' ? { outDir: 'dist-preview', copyPublicDir: false } : {},
}));
