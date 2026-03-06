import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type CollectionKey, getCollection } from '../../schemas/cms'
import { fetchCollectionData } from '../lib/collectionData'
import { useToggleChainStore } from './useToggleChainStore'

type SearchResult = {
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

function getSearchRank(query: string, name: string, address: string) {
  const normalizedName = name.toLowerCase()
  const normalizedAddress = address.toLowerCase()

  if (normalizedName === query || normalizedAddress === query) return 0
  if (normalizedName.startsWith(query)) return 1
  if (normalizedAddress.startsWith(query)) return 2
  if (normalizedName.includes(query)) return 3
  if (normalizedAddress.includes(query)) return 4
  return Number.POSITIVE_INFINITY
}

export function useAssetSearchResults(query: string, enabled: boolean) {
  const { toggledChains } = useToggleChainStore()
  const normalizedQuery = query.trim().toLowerCase()
  const searchEnabled = enabled && normalizedQuery.length > 0
  const vaultsQuery = useQuery({
    queryKey: ['vaults-meta'],
    queryFn: () => fetchCollectionData('vaults'),
    staleTime: 1000 * 60 * 5,
    enabled: searchEnabled,
  })
  const strategiesQuery = useQuery({
    queryKey: ['strategies-meta'],
    queryFn: () => fetchCollectionData('strategies'),
    staleTime: 1000 * 60 * 5,
    enabled: searchEnabled,
  })
  const tokensQuery = useQuery({
    queryKey: ['tokens-meta'],
    queryFn: () => fetchCollectionData('tokens'),
    staleTime: 1000 * 60 * 5,
    enabled: searchEnabled,
  })
  const queries = [vaultsQuery, strategiesQuery, tokensQuery]

  const results = useMemo(() => {
    if (!searchEnabled) {
      return []
    }

    return searchCollections
      .flatMap(({ key, typeLabel }, index) => {
        const queryData = queries[index]?.data
        if (!queryData) {
          return []
        }

        return queryData.flat
          .map((raw) => getCollection(key).schema.parse(raw) as { chainId: number; address: string; name: string })
          .filter((item) => toggledChains.has(item.chainId))
          .map((item) => {
            const name = item.name || 'No name onchain'
            const rank = getSearchRank(normalizedQuery, name, item.address)
            return {
              id: `${key}:${item.chainId}:${item.address.toLowerCase()}`,
              collection: key,
              chainId: item.chainId,
              address: item.address,
              name,
              path: `/${key}/${item.chainId}/${item.address}`,
              typeLabel,
              rank,
            } satisfies SearchResult
          })
          .filter((item) => Number.isFinite(item.rank))
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        if (a.chainId !== b.chainId) return a.chainId - b.chainId
        return a.name.localeCompare(b.name)
      })
      .slice(0, SEARCH_LIMIT)
  }, [normalizedQuery, queries, searchEnabled, toggledChains])

  return {
    results,
    isLoading: searchEnabled && queries.some((queryState) => queryState.isLoading),
    isFetching: searchEnabled && queries.some((queryState) => queryState.isFetching),
  }
}
