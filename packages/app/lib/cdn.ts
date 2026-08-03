export function getCdnUrl() {
  const base = process.env.NEXT_PUBLIC_CDN_URL || '/cdn/'
  return base.endsWith('/') ? base : `${base}/`
}
