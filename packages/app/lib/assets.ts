const BASE_URL = import.meta.env.VITE_ASSETS_CDN_URL?.endsWith('/')
  ? import.meta.env.VITE_ASSETS_CDN_URL
  : `${import.meta.env.VITE_ASSETS_CDN_URL}/`

export function getChainIconUrl(chainId: number) {
  return `${BASE_URL}chains/${chainId}/logo.svg`
}

export function getTokenIconUrl(chainId: number, address: string) {
  return `${BASE_URL}tokens/${chainId}/${address.toLowerCase()}/logo.svg`
}
