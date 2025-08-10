export function getCdnUrl() {
  const base = import.meta.env.VITE_CDN_URL || '/cdn/'
  return base.endsWith('/') ? base : `${base}/`
}
