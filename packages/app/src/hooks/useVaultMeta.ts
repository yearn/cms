import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getCdnUrl } from '../../lib/cdn'
import { chains } from '../../lib/chains'
import { VaultMetadataSchema } from '../../schemas/VaultMetadata'

export function useVaultsMeta() {
  const query = useSuspenseQuery({
    queryKey: ['vaults-meta'],
    queryFn: async () => {
      const promises = Object.values(chains).map(chain => fetch(`${getCdnUrl()}vaults/${chain.id}.json`))
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

  const sortedVaults = useMemo(() => {
    return vaults.sort((a, b) => {
      if (a.chainId < b.chainId) return -1
      if (a.chainId > b.chainId) return 1
      if (a.name < b.name) return -1
      if (a.name > b.name) return 1
      return 0
    })
  }, [vaults])

  return {
    ...query,
    vaults: sortedVaults,
    rawJsonChainMap: query.data.rawJsonChainMap
  }
}