import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getCdnUrl } from '../../lib/cdn'
import { chains } from '../../lib/chains'
import { StrategyMetadataSchema } from '../../schemas/StrategyMetadata'

export function useStrategyMeta() {
  const query = useSuspenseQuery({
    queryKey: ['strategies-meta'],
    queryFn: async () => {
      const promises = Object.values(chains).map(chain => fetch(`${getCdnUrl()}strategies/${chain.id}.json`))
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

  const strategies = useMemo(() => {
    return query.data.flat.map(d => StrategyMetadataSchema.parse(d))
  }, [query.data.flat])

  return {
    ...query,
    strategies,
    rawJsonChainMap: query.data.rawJsonChainMap
  }
}