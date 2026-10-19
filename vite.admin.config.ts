import path from "path"
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Admin app build: admin.html -> src/admin/main.tsx, deployed as its own Netlify
// site (admin.assetmx.com.au). `npm run build:admin` writes dist-admin/;
// on Netlify, build:netlify writes it to dist/ when APP_TARGET=admin.
//
// Netlify reads _redirects before netlify.toml, so these rules win over the
// public app's redirects in the shared netlify.toml.
const netlifyFiles = (): Plugin => ({
  name: 'admin-netlify-files',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: '_redirects',
      source: ['/  /admin  302', '/admin  /admin.html  200!', '/admin/*  /admin.html  200!', '/*  /admin.html  200', ''].join('\n'),
    })
    this.emitFile({
      type: 'asset',
      fileName: '_headers',
      source: ['/*', '  X-Robots-Tag: noindex, nofollow', '  Referrer-Policy: same-origin', ''].join('\n'),
    })
  },
})

export default defineConfig({
  plugins: [react(), netlifyFiles()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist-admin',
    rollupOptions: { input: path.resolve(__dirname, 'admin.html') },
  },
})
