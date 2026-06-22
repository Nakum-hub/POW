import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The base path is configurable so the same build works at the domain root
// (Vercel / Netlify / custom domain) and under a sub-path (GitHub Pages project
// sites are served from https://<user>.github.io/<repo>/).
// Set VITE_BASE_PATH="/POW/" for GitHub Pages, or leave unset for root hosting.
const basePath = process.env.VITE_BASE_PATH || '/';

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
