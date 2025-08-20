import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getCdnUrl } from '../../lib/cdn'
import { chains } from '../../lib/chains'
import { type CollectionKey, getCollection } from '../../schemas/cms'
import type { StrategyMetadata } from '../../schemas/StrategyMetadata'
import type { VaultMetadata } from '../../schemas/VaultMetadata'

type CollectionDataMap = {
  vaults: VaultMetadata[]
  strategies: StrategyMetadata[]
}

export function useCollectionData<K extends CollectionKey>(
  collectionKey: K,
): {
  data: CollectionDataMap[K]
  rawJsonChainMap: Record<string, any>
  isLoading: boolean
  error: Error | null
} {
  const collection = getCollection(collectionKey)

  const query = useSuspenseQuery({
    queryKey: [`${collectionKey}-meta`],
    queryFn: async () => {
      const promises = Object.values(chains).map((chain) => fetch(`${getCdnUrl()}${collectionKey}/${chain.id}.json`))
      const jsonPromises = (await Promise.all(promises)).flatMap((result) => result.json())
      const jsons = await Promise.all(jsonPromises)

      const chainKeys = Object.keys(chains).map(Number)
      const rawJsonChainMap: Record<string, any> = {}
      jsons.forEach((json, index) => {
        const chainId = chains[chainKeys[index]].id
        rawJsonChainMap[chainId] = json
      })

      return { flat: jsons.flat(), rawJsonChainMap }
    },
    staleTime: 1000 * 60 * 5,
  })

  const typedData = useMemo(() => {
    return query.data.flat.map((d) => collection.schema.parse(d))
  }, [query.data.flat, collection.schema]) as CollectionDataMap[K]

  const sortedData = useMemo(() => {
    return typedData.sort((a, b) => {
      if (a.chainId < b.chainId) return -1
      if (a.chainId > b.chainId) return 1
      if (a.name < b.name) return -1
      if (a.name > b.name) return 1
      return 0
    })
  }, [typedData]) as CollectionDataMap[K]

  return {
    data: sortedData,
    rawJsonChainMap: query.data.rawJsonChainMap,
    isLoading: query.isLoading,
    error: query.error,
  }
}
