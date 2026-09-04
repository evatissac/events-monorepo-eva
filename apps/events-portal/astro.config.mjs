import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'next/link': path.resolve(__dirname, './src/lib/next-link.tsx'),
        'next/image': path.resolve(__dirname, './src/lib/next-image.tsx'),
        'next-themes': path.resolve(__dirname, './src/lib/next-themes.tsx'),
      },
    },
  },
  server: { host: true, port: 4321 },
});
