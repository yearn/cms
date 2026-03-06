import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type CollectionKey, getCollection } from '../../schemas/cms'
import type { StrategyMetadata } from '../../schemas/StrategyMetadata'
import type { TokenMetadata } from '../../schemas/TokenMetadata'
import type { VaultMetadata } from '../../schemas/VaultMetadata'
import { fetchCollectionData } from '../lib/collectionData'

type CollectionDataMap = {
  vaults: VaultMetadata[]
  strategies: StrategyMetadata[]
  tokens: TokenMetadata[]
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
    queryFn: () => fetchCollectionData(collectionKey),
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
