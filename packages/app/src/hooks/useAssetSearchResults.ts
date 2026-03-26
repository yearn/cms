import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type CollectionKey, getCollection } from '../../schemas/cms'
import { fetchCollectionData } from '../lib/collectionData'
import { useToggleChainStore } from './useToggleChainStore'

export type SearchResult = {
  id: string
  collection: CollectionKey
  chainId: number
  address: string
  name: string
  path: string
  typeLabel: 'Vault' | 'Strategy' | 'Token'
  rank: number
}

const SEARCH_LIMIT = 12
const searchCollections: Array<{ key: CollectionKey; typeLabel: SearchResult['typeLabel'] }> = [
  { key: 'vaults', typeLabel: 'Vault' },
  { key: 'strategies', typeLabel: 'Strategy' },
  { key: 'tokens', typeLabel: 'Token' },
]

function getSearchRank(query: string, name: string, address: string): number {
  const normalizedName = name.toLowerCase()
  const normalizedAddress = address.toLowerCase()

  if (normalizedName === query || normalizedAddress === query) return 0
  if (normalizedName.startsWith(query)) return 1
  if (normalizedAddress.startsWith(query)) return 2
  if (normalizedName.includes(query)) return 3
  if (normalizedAddress.includes(query)) return 4
  return Number.POSITIVE_INFINITY
}

function useSearchCollectionQuery(collectionKey: CollectionKey, enabled: boolean) {
  return useQuery({
    queryKey: [`${collectionKey}-meta`],
    queryFn: () => fetchCollectionData(collectionKey),
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}

function buildSearchResultsForCollection(
  collectionKey: CollectionKey,
  typeLabel: SearchResult['typeLabel'],
  rawItems: unknown[],
  normalizedQuery: string,
  toggledChains: Set<number>,
): SearchResult[] {
  return rawItems
    .map((raw) => getCollection(collectionKey).schema.parse(raw) as { chainId: number; address: string; name: string })
    .filter((item) => toggledChains.has(item.chainId))
    .map((item) => {
      const name = item.name || 'No name onchain'
      const rank = getSearchRank(normalizedQuery, name, item.address)

      return {
        id: `${collectionKey}:${item.chainId}:${item.address.toLowerCase()}`,
        collection: collectionKey,
        chainId: item.chainId,
        address: item.address,
        name,
        path: `/${collectionKey}/${item.chainId}/${item.address}`,
        typeLabel,
        rank,
      } satisfies SearchResult
    })
    .filter((item) => Number.isFinite(item.rank))
}

export function useAssetSearchResults(query: string, enabled: boolean) {
  const { toggledChains } = useToggleChainStore()
  const normalizedQuery = query.trim().toLowerCase()
  const searchEnabled = enabled && normalizedQuery.length > 0
  const queryStates = {
    vaults: useSearchCollectionQuery('vaults', searchEnabled),
    strategies: useSearchCollectionQuery('strategies', searchEnabled),
    tokens: useSearchCollectionQuery('tokens', searchEnabled),
  }

  const results = useMemo(() => {
    if (!searchEnabled) {
      return []
    }

    return searchCollections
      .flatMap(({ key, typeLabel }) => {
        const queryData = queryStates[key].data
        if (!queryData?.flat) {
          return []
        }

        return buildSearchResultsForCollection(key, typeLabel, queryData.flat, normalizedQuery, toggledChains)
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        if (a.chainId !== b.chainId) return a.chainId - b.chainId
        return a.name.localeCompare(b.name)
      })
      .slice(0, SEARCH_LIMIT)
  }, [normalizedQuery, queryStates, searchEnabled, toggledChains])

  const queryValues = Object.values(queryStates)

  return {
    results,
    isLoading: searchEnabled && queryValues.some((queryState) => queryState.isLoading),
    isFetching: searchEnabled && queryValues.some((queryState) => queryState.isFetching),
  }
}
