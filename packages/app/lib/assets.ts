const ASSETS_CDN_URL = process.env.NEXT_PUBLIC_ASSETS_CDN_URL || 'https://cdn.jsdelivr.net/gh/yearn/tokenAssets@main'
const BASE_URL = ASSETS_CDN_URL.endsWith('/') ? ASSETS_CDN_URL : `${ASSETS_CDN_URL}/`

export function getChainIconUrl(chainId: number) {
  return `${BASE_URL}chains/${chainId}/logo.svg`
}

export function getTokenIconUrl(chainId: number, address: string) {
  return `${BASE_URL}tokens/${chainId}/${address.toLowerCase()}/logo.svg`
}

export function getTokenLogoUrl(
  chainId: number,
  address: string,
  fileName: 'logo.svg' | 'logo-32.png' | 'logo-128.png',
) {
  return `${BASE_URL}tokens/${chainId}/${address.toLowerCase()}/${fileName}`
}
