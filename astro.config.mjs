import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://linshen.me',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
});
