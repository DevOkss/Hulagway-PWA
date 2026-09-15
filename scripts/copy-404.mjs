// Post-build: copy dist/index.html -> dist/404.html so GitHub Pages (which
// has no server-side rewrites) boots the SPA on refresh/deep links
// (e.g. /Hulagway-PWA/login). The served URL is preserved, so the router
// resolves the route client-side. Runs via the `postbuild` npm hook.
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const index = join(root, 'dist', 'index.html')

if (!existsSync(index)) {
  console.error('[copy-404] dist/index.html not found — run `vite build` first')
  process.exit(1)
}
copyFileSync(index, join(root, 'dist', '404.html'))
console.log('[copy-404] dist/404.html written')
