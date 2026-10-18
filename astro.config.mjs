// @ts-check
import { defineConfig } from 'astro/config';

// When publishing to GitHub Pages under a sub-path, set SITE and BASE, e.g.
// SITE=https://USER.github.io BASE=/donors-guide npm run build
export default defineConfig({
  site: process.env.SITE || 'https://example.org',
  base: process.env.BASE || '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
