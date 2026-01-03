// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  // Note: Astro 5 defaults to static output with on-demand rendering support

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: netlify({
    devFeatures: {
      environmentVariables: true,
      images: true
    }
  })
});