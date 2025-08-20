import { useSuspenseQuery } from '@tanstack/react-query'
import { getCdnUrl } from '../../lib/cdn'
import { type GlobalKey, getGlobal } from '../../schemas/cms'
import type { YearnFi } from '../../schemas/YearnFi'

type GlobalDataMap = {
  yearnFi: YearnFi
}

export function useGlobalData<K extends GlobalKey>(
  globalKey: K,
): {
  data: GlobalDataMap[K]
  isLoading: boolean
  error: Error | null
} {
  const globalConfig = getGlobal(globalKey)

  const query = useSuspenseQuery({
    queryKey: [`global-${globalKey}`],
    queryFn: async () => {
      const response = await fetch(`${getCdnUrl()}globals/${globalKey}.json`)
      if (!response.ok) {
        throw new Error(`Failed to fetch global ${globalKey}`)
      }
      const json = await response.json()
      return globalConfig.schema.parse(json)
    },
    staleTime: 1000 * 60 * 5,
  })

  return {
    data: query.data as GlobalDataMap[K],
    isLoading: query.isLoading,
    error: query.error,
  }
}
