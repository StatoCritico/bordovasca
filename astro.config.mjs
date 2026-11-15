// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bordovasca.statocritico.it',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
