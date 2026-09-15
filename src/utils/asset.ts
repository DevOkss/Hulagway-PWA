// Base-aware URL helpers for GitHub Pages project-site hosting.
//
// The app is served under a subpath in production (e.g. /Hulagway-PWA/),
// so absolute `/...` URLs break there. Always build public-asset and
// location URLs through these helpers — in local dev BASE_URL is `/`,
// so behavior is unchanged.

export const BASE_URL: string = import.meta.env.BASE_URL || '/'

const joinBase = (path: string) => {
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`
  return `${base}${path.replace(/^\/+/, '')}`
}

/** URL for a file in `public/` (e.g. asset('logo.png')). */
export const asset = (path: string): string => joinBase(path)

/** URL for an app route (e.g. routeUrl('login')). */
export const routeUrl = (path: string): string => joinBase(path)
