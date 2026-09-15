// Base-aware URL helpers for public assets and app routes.
//
// Absolute `/...` URLs break if the app is ever served under a subpath,
// so public-asset and location URLs go through these helpers — with the
// root base used in dev and on Vercel, output is identical to `/...`.

export const BASE_URL: string = import.meta.env.BASE_URL || '/'

const joinBase = (path: string) => {
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`
  return `${base}${path.replace(/^\/+/, '')}`
}

/** URL for a file in `public/` (e.g. asset('logo.png')). */
export const asset = (path: string): string => joinBase(path)

/** URL for an app route (e.g. routeUrl('login')). */
export const routeUrl = (path: string): string => joinBase(path)
