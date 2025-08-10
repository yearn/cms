import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { chains } from '../../lib/chains'
import { VaultMetadataSchema } from '../../schemas/VaultMetadata'

const CDN_URL = import.meta.env.VITE_CDN_URL?.endsWith('/') ? import.meta.env.VITE_CDN_URL : `${import.meta.env.VITE_CDN_URL}/`

export function useVaultsMeta() {
  const query = useSuspenseQuery({
    queryKey: ['vaults-meta'],
    queryFn: async () => {
      const promises = Object.values(chains).map(chain => fetch(`${CDN_URL}content/vaults/${chain.id}.json`))
      const jsonPromises = (await Promise.all(promises)).flatMap(result => result.json())
      const jsons = await Promise.all(jsonPromises)

      const chainKeys = Object.keys(chains).map(Number)
      const rawJsonChainMap: Record<string, any> = {}
      jsons.forEach((json, index) => {
        const chainId = chains[chainKeys[index]].id
        rawJsonChainMap[chainId] = json
      })

      return { flat: jsons.flat(), rawJsonChainMap }
    },
    staleTime: 1000 * 60 * 5
  })

  const vaults = useMemo(() => {
    return query.data.flat.map(d => VaultMetadataSchema.parse(d))
  }, [query.data.flat])

  return {
    ...query,
    vaults,
    rawJsonChainMap: query.data.rawJsonChainMap
  }
}